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

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
