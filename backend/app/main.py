"""FastAPI application factory."""

from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.adapters.llm import LLMNotConfiguredError
from app.config import get_settings
from app.routers import captions, health, media, products


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.include_router(health.router)
    app.include_router(captions.router)
    app.include_router(media.router)
    app.include_router(products.router)

    # The LLM provider dependency raises this when no API key is set.
    @app.exception_handler(LLMNotConfiguredError)
    def llm_not_configured(request: Request, exc: LLMNotConfiguredError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": str(exc)},
        )

    # Downloaded YouCam results are stored locally and served as static
    # files — YouCam deletes uploads/results within ~24h, so nothing can
    # be hot-linked from their side.
    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_dir), name="media")

    return app


app = create_app()
