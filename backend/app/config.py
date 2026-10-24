from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_TEXT_MODEL = "nvidia/nemotron-3.5-super-vl:free"
_DEFAULT_VISION_MODEL = "nvidia/nemotron-3.5-super-vl:free"
_DEFAULT_VISION_FALLBACKS = "google/gemma-4-31b-it:free,qwen/qwen3.7-flash"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # backend-local .env wins over the repo root one
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
    # free-tier caption model; slugs rotate, check openrouter.ai/models if it breaks
    llm_model_text: str = _DEFAULT_TEXT_MODEL
    # fallbacks for the text model, tried in order
    llm_model_text_fallbacks: str = _DEFAULT_VISION_FALLBACKS
    # fallbacks for the vision model, tried in order
    llm_model_vision: str = _DEFAULT_VISION_MODEL
    llm_model_vision_fallbacks: str = _DEFAULT_VISION_FALLBACKS

    # YouCam media API, not OpenAI-compatible, so plain httpx
    youcam_api_key: str = ""
    youcam_base_url: str = "https://yce-api-01.makeupar.com"
    # youcam image model, 1 unit per task
    youcam_image_model: str = "youcam-image-v2"
    youcam_poll_interval_seconds: float = 2.0
    youcam_timeout_seconds: float = 180.0

    # YouCam result URLs expire, so outputs are downloaded and kept here
    media_dir: str = "./media"

    # live = real YouCam calls, passthrough = original photo only
    media_mode: str = "passthrough"

    # posts due posts every 30s, off in tests
    scheduler_enabled: bool = True
    # required X-Tick-Secret header for /internal/tick, blank = off
    internal_tick_secret: str = ""

    def model_post_init(self, __context) -> None:
        # blank env vars (e.g. LLM_MODEL_TEXT=) must not override defaults
        if not self.llm_model_text.strip():
            self.llm_model_text = _DEFAULT_TEXT_MODEL
        if not self.llm_model_vision.strip():
            self.llm_model_vision = _DEFAULT_VISION_MODEL
        if not self.llm_model_vision_fallbacks.strip():
            self.llm_model_vision_fallbacks = _DEFAULT_VISION_FALLBACKS
        if not self.llm_model_text_fallbacks.strip():
            self.llm_model_text_fallbacks = _DEFAULT_VISION_FALLBACKS
        self.media_mode = self.media_mode.strip().lower() or "passthrough"
        if not self.youcam_image_model.strip():
            self.youcam_image_model = "youcam-image-v2"

    @property
    def vision_models(self) -> list[str]:
        return _model_chain(self.llm_model_vision, self.llm_model_vision_fallbacks)

    @property
    def text_models(self) -> list[str]:
        return _model_chain(self.llm_model_text, self.llm_model_text_fallbacks)


def _model_chain(main: str, fallbacks: str) -> list[str]:
    models = [main]
    for name in fallbacks.split(","):
        name = name.strip()
        if name and name not in models:
            models.append(name)
    return models


@lru_cache
def get_settings() -> Settings:
    return Settings()
