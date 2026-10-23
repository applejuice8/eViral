"""FastAPI application factory."""

from fastapi import FastAPI

from app.config import get_settings
from app.routers import captions, health


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.include_router(health.router)
    app.include_router(captions.router)

    return app


app = create_app()
