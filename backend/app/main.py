from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import auth, profile, checkins, gameplan, clipboard, community, misc


app = FastAPI(title="Third & Manageable API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# No `@app.on_event("startup")` schema work. It used to run `create_all` +
# `alembic stamp` + `seed_forums` on boot, which on Fluid Compute means on every
# cold start — one of the two blockers §2.2 names for the bridge. Drizzle owns
# the schema and `python -m app.seed` owns the seed data; both are explicit
# release steps now (VERCEL_MIGRATION_PLAN.md Phase 2 step 11).


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
