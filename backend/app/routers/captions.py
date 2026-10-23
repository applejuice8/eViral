from fastapi import APIRouter, Depends, HTTPException, status

from app.adapters.llm import (
    LLMError,
    LLMNotConfiguredError,
    LLMProvider,
    get_llm_provider,
)
from app.schemas.captions import CaptionRequest, CaptionResponse
from app.services.writer import generate_captions

router = APIRouter(prefix="/captions", tags=["captions"])


@router.post("/generate", response_model=CaptionResponse)
def generate(
    request: CaptionRequest,
    provider: LLMProvider = Depends(get_llm_provider),
) -> CaptionResponse:
    """Generate one caption per requested platform from owner-entered facts."""
    try:
        return generate_captions(request, provider)
    except LLMNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Caption generation failed: {exc}",
        ) from exc
