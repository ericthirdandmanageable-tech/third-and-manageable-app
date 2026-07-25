from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routes import auth, profile, checkins, gameplan, clipboard, community, misc


app = FastAPI(title="Third & Manageable API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Alembic owns the schema. For a brand-new dev DB (no tables, no
    # alembic_version), create_all + stamp head (create_all produces the
    # current schema, i.e. head) so `alembic history` and future autogenerate
    # work against the file. Existing DBs: Alembic-driven.
    insp = inspect(engine)
    has_tables = bool(insp.get_table_names())
    has_version = insp.has_table("alembic_version")
    if not has_tables and not has_version:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            conn.execute(text(
                "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"
            ))
            conn.execute(text(
                "INSERT INTO alembic_version (version_num) VALUES ('7d2e5f8a1c34')"
            ))
    db = SessionLocal()
    try:
        community.seed_forums(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(checkins.router)
app.include_router(gameplan.router)
app.include_router(clipboard.router)
app.include_router(community.router)
app.include_router(misc.router)