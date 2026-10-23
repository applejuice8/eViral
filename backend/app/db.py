"""Database engine and session management (SQLAlchemy 2.0)."""

from collections.abc import Generator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

_settings = get_settings()

# SQLite needs this for use across threads (TestClient, BackgroundTasks);
# it is not valid for Postgres.
_connect_args = (
    {"check_same_thread": False}
    if _settings.database_url.startswith("sqlite")
    else {}
)

# An in-memory SQLite db only lives as long as its connection, so all
# sessions must share one (used by the tests).
_pool_args = (
    {"poolclass": StaticPool}
    if _settings.database_url in ("sqlite://", "sqlite:///:memory:")
    else {"pool_pre_ping": True}
)

engine = create_engine(
    _settings.database_url,
    connect_args=_connect_args,
    **_pool_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base; all ORM models register here so Alembic can see them."""

    # Named constraints so Alembic batch migrations work on SQLite.
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

