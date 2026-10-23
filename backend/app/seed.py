"""Seed the database with the demo business and owner.

    uv run python -m app.seed          # migrate to head, then seed (safe to re-run)
    uv run python -m app.seed --reset  # drop everything, migrate, then seed

This is a prototype, so --reset simply throws all data away.
"""

import argparse
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import AppUser, Business

BUSINESS_NAME = "Kek Kak Nora"
OWNER_NAME = "Aisha Rahman"

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def ensure_owner(db: Session) -> AppUser:
    """Return the demo owner, creating the business and owner if missing."""
    business = db.scalar(select(Business).where(Business.name == BUSINESS_NAME))
    if business is None:
        business = Business(
            name=BUSINESS_NAME,
            kind="Home bakery",
            halal_certified=True,
            tone="friendly",
            languages=["ms", "en"],
        )
        db.add(business)
        db.flush()

    owner = db.scalar(
        select(AppUser).where(
            AppUser.business_id == business.id, AppUser.role == "owner"
        )
    )
    if owner is None:
        owner = AppUser(business_id=business.id, name=OWNER_NAME, role="owner")
        db.add(owner)
    db.commit()
    return owner


def migrate() -> None:
    command.upgrade(Config(str(_ALEMBIC_INI)), "head")


def reset() -> None:
    Base.metadata.drop_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    migrate()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Seed the eViral database.")
    parser.add_argument(
        "--reset", action="store_true", help="drop all data before seeding"
    )
    args = parser.parse_args(argv)

    if args.reset:
        reset()
    else:
        migrate()

    with SessionLocal() as db:
        owner = ensure_owner(db)
        print(f"Seeded business '{owner.business.name}' with owner '{owner.name}'.")


if __name__ == "__main__":
    main()
