import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SCHEDULER_ENABLED"] = "false"
# keep tests off YouCam and on the default MEDIA_MODE
os.environ["MEDIA_MODE"] = "passthrough"
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
