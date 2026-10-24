import logging
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.adapters.llm import LLMNotConfiguredError
from app.config import get_settings
from app.routers import (
    campaigns,
    captions,
    dashboard,
    health,
    internal,
    media,
    posts,
    products,
)
from app.services.posting import run_tick

# show app logs next to uvicorn's
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    if get_settings().scheduler_enabled:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            run_tick, "interval", seconds=30, max_instances=1, coalesce=True
        )
        scheduler.start()
        logger.info("Posting scheduler started")
    yield
    if scheduler is not None:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

    app.include_router(health.router)
    app.include_router(captions.router)
    app.include_router(media.router)
    app.include_router(products.router)
    app.include_router(campaigns.router)
    app.include_router(posts.router)
    app.include_router(dashboard.router)
    app.include_router(internal.router)

    # raised when no API key is set
    @app.exception_handler(LLMNotConfiguredError)
    def llm_not_configured(request: Request, exc: LLMNotConfiguredError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": str(exc)},
        )

    # YouCam results expire, so they are served from local /media files
    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_dir), name="media")

    return app


app = create_app()
