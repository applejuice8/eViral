from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.adapters.publisher import Publisher, get_publisher
from app.config import get_settings
from app.db import get_db
from app.schemas.dashboard import TickResponse
from app.services.posting import tick

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/tick", response_model=TickResponse)
def run_tick(
    x_tick_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
    publisher: Publisher = Depends(get_publisher),
) -> TickResponse:
    secret = get_settings().internal_tick_secret
    if secret and x_tick_secret != secret:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bad tick secret")
    return TickResponse(posted=tick(db, publisher))
