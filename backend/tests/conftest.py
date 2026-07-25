import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point the app at a throwaway SQLite file BEFORE importing app modules.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

from app.main import app  # noqa: E402
from app.database import Base, get_db  # noqa: E402

engine = create_engine(f"sqlite:///{_tmp.name}", connect_args={"check_same_thread": False})
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


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
