"""Application configuration.

All settings come from environment variables (optionally via a local .env
file, see .env.example). Nothing here should hardcode credentials.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "eViral API"
    debug: bool = False
    database_url: str = "sqlite:///./eviral.db"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor; import and call this, never read env ad hoc."""
    return Settings()
