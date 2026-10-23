"""Application configuration.

All settings come from environment variables (optionally via a local .env
file, see .env.example). Nothing here should hardcode credentials.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_TEXT_MODEL = "nvidia/nemotron-3.5-super-vl:free"
_DEFAULT_VISION_MODEL = "nvidia/nemotron-3.5-super-vl:free"
_DEFAULT_VISION_FALLBACKS = "google/gemma-4-31b-it:free,qwen/qwen3.7-flash"


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
    # Free model slugs rotate often on OpenRouter — verify on
    # https://openrouter.ai/models?max_price=0 if this starts failing.
    llm_model_text: str = _DEFAULT_TEXT_MODEL
    # Tried in order when the text model fails (campaign captions).
    llm_model_text_fallbacks: str = _DEFAULT_VISION_FALLBACKS
    # Photo understanding. If the main model fails or returns bad JSON the
    # fallbacks (comma separated) are tried in order; the last one is paid.
    llm_model_vision: str = _DEFAULT_VISION_MODEL
    llm_model_vision_fallbacks: str = _DEFAULT_VISION_FALLBACKS

    # YouCam (Perfect Corp) media API — a proprietary REST task API
    # (Bearer auth, async tasks with polling), NOT OpenAI-compatible,
    # so it cannot go through the OpenAI SDK; it uses httpx directly.
    youcam_api_key: str = ""
    youcam_base_url: str = "https://yce-api-01.makeupar.com"
    # AI Image Generator V2 "youcam-image-v2": 1 unit per successful
    # task — the cheapest image generation route on the platform
    # (Background Change costs 4 units/unit-task, Studio Generator more).
    youcam_image_model: str = "youcam-image-v2"
    youcam_poll_interval_seconds: float = 2.0
    youcam_timeout_seconds: float = 180.0

    # Local storage for downloaded YouCam results. The API deletes uploads
    # and results within ~24h (result URLs expire in ~2h), so every output
    # must be downloaded immediately and kept ourselves. Served as static
    # files under /media by the app.
    media_dir: str = "./media"

    # "live" makes real YouCam calls when building a campaign (enhance +
    # stage images). "passthrough" uses the original photo for every post,
    # so dev runs and tests never spend YouCam credits.
    media_mode: str = "passthrough"

    # Background job that posts due posts every 30 seconds (off in tests).
    scheduler_enabled: bool = True
    # POST /internal/tick must send this in X-Tick-Secret. Blank = no check.
    internal_tick_secret: str = ""

    def model_post_init(self, __context) -> None:
        # Docker/compose setups often export blank vars (LLM_MODEL_TEXT=);
        # a blank value must not override the default.
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
        """Main vision model followed by the fallbacks, without duplicates."""
        return _model_chain(self.llm_model_vision, self.llm_model_vision_fallbacks)

    @property
    def text_models(self) -> list[str]:
        """Main text model followed by the fallbacks, without duplicates."""
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
    """Cached settings accessor; import and call this, never read env ad hoc."""
    return Settings()
