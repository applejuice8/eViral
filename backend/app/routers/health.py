from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])

API_VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness probe: no database or external calls, always cheap."""
    return HealthResponse(status="ok", version=API_VERSION)
