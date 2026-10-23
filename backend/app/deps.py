"""Shared FastAPI dependencies."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AppUser
from app.seed import ensure_owner


def current_user(db: Session = Depends(get_db)) -> AppUser:
    """Single-user prototype with no login: always the seeded owner."""
    return ensure_owner(db)
