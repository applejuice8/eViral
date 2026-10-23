"""Shared pytest fixtures.

Sets the database URL before the app is imported so app.config/db pick it
up at import time.
"""

import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
