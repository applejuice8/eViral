"""Shared pytest fixtures.

Sets environment before the app is imported so app.config/db pick it
up at import time.
"""

import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# Keep downloaded (stub) media out of the repo during tests.
_media_tmp = tempfile.mkdtemp(prefix="eviral-test-media-")
os.environ.setdefault("MEDIA_DIR", _media_tmp)

import pytest
from fastapi.testclient import TestClient

import app.models  # noqa: F401  (registers tables)
from app.db import Base, SessionLocal, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    """Every test starts with empty tables in the shared in-memory db."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture()
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
