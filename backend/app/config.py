"""Application configuration.

All settings come from environment variables (optionally via a local .env
file, see .env.example). Nothing here should hardcode credentials.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Later files win: a backend-local .env overrides the repo root .env.
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "eViral API"
    debug: bool = False
    database_url: str = "sqlite:///./eviral.db"

    # OpenRouter (OpenAI-compatible endpoint)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Free-tier model used for caption generation; override in env.
    llm_model_text: str = "meta-llama/llama-3.3-70b-instruct:free"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor; import and call this, never read env ad hoc."""
    return Settings()
