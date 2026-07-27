import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Point the app at a throwaway SQLite file BEFORE importing app modules.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

# The suite exercises the verified, signed-in flow, and `AUTO_VERIFY` now
# defaults to False so the unsafe value is the one you have to ask for. Pin
# both explicitly rather than inheriting: neither the developer's shell nor an
# uncommitted `backend/.env` gets to decide whether these tests pass.
os.environ["AUTO_VERIFY"] = "true"
os.environ["ENVIRONMENT"] = "development"

from app.main import app  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.routes.community import seed_forums  # noqa: E402

engine = create_engine(f"sqlite:///{_tmp.name}", connect_args={"check_same_thread": False})


# SQLite ignores foreign keys unless asked. The baseline leans on real FKs
# (split vote tables, restrict-on-delete authorship), so without this the
# suite would pass on constraints Postgres would reject.
@event.listens_for(engine, "connect")
def _enforce_sqlite_fks(dbapi_conn, _record):
    # Via an explicitly closed cursor: `dbapi_conn.execute(...)` leaves an
    # implicit cursor open, which pins that pooled connection to a read
    # snapshot taken at connect time — it then never sees other connections'
    # commits, and rows written by one request vanish from the next.
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)

# Seeding is an explicit step now that it no longer runs on app startup (§2.2).
_seed_db = TestingSession()
try:
    seed_forums(_seed_db)
finally:
    _seed_db.close()


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    r = client.post("/auth/register", json={
        "email": "api@test.dev", "password": "password123", "display_name": "API Tester",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def user_by_email(db, email: str):
    """Tests used to `filter(User.email == ...)`. Email lives in `user_emails`
    now, and is looked up through the normalized column."""
    from app.auth import normalize_email
    from app.database import UserEmail

    row = (
        db.query(UserEmail)
        .filter(UserEmail.normalized_email == normalize_email(email))
        .first()
    )
    return row.user if row else None
