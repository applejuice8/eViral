from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)

from app.adapters.media import (
    MediaError,
    MediaNotConfiguredError,
    MediaProvider,
    get_media_provider,
)
from app.schemas.media import EnhanceScale, MediaAssetResponse, TextImageSize
from app.services.media import (
    change_background,
    enhance_image,
    background_templates,
    generate_poster_from_image,
    generate_poster_from_text,
)

router = APIRouter(prefix="/media", tags=["media"])


def _read_upload(image: UploadFile) -> tuple[bytes, str]:
    data = image.file.read()
    return data, image.content_type or ""


def _media_error(exc: MediaError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Media task failed: {exc}",
    )


@router.post("/enhance", response_model=MediaAssetResponse)
def enhance(
    request: Request,
    image: Annotated[
        UploadFile | None, File(description="Photo to enhance (jpg/png, <10MB)")
    ] = None,
    image_url: Annotated[str | None, Form(description="Public URL of the photo")] = None,
    scale: Annotated[EnhanceScale, Form(description="Upscale ratio")] = EnhanceScale.X1,
    provider: MediaProvider = Depends(get_media_provider),
) -> MediaAssetResponse:
    try:
        data, content_type = _read_upload(image) if image else (None, None)
        return enhance_image(
            provider,
            image=data,
            content_type=content_type,
            image_url=image_url,
            scale=int(scale),
            base_url=str(request.base_url),
        )
    except MediaNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except MediaError as exc:
        raise _media_error(exc) from exc


@router.post("/poster", response_model=MediaAssetResponse)
def poster_from_image(
    request: Request,
    image: Annotated[
        UploadFile | None, File(description="Product photo to build the poster around")
    ] = None,
    image_url: Annotated[str | None, Form(description="Public URL of the photo")] = None,
    prompt: Annotated[str, Form(description="Scene/style for the poster (max 800 chars)")] = "",
    negative_prompt: Annotated[str | None, Form()] = None,
    size: Annotated[
        str | None,
        Form(pattern=r"^\d{3,4}\*\d{3,4}$", description="W*H, each side 512-2048"),
    ] = None,
    provider: MediaProvider = Depends(get_media_provider),
) -> MediaAssetResponse:
    try:
        data, content_type = _read_upload(image) if image else (None, None)
        return generate_poster_from_image(
            provider,
            image=data,
            content_type=content_type,
            image_url=image_url,
            prompt=prompt,
            negative_prompt=negative_prompt,
            size=size,
            base_url=str(request.base_url),
        )
    except MediaNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except MediaError as exc:
        raise _media_error(exc) from exc


@router.post("/poster/text", response_model=MediaAssetResponse)
def poster_from_text(
    request: Request,
    prompt: Annotated[str, Form(description="Poster description (max 800 chars)")] = "",
    negative_prompt: Annotated[str | None, Form()] = None,
    size: Annotated[TextImageSize, Form()] = "1664*928",
    provider: MediaProvider = Depends(get_media_provider),
) -> MediaAssetResponse:
    try:
        return generate_poster_from_text(
            provider,
            prompt=prompt,
            negative_prompt=negative_prompt,
            size=size,
            base_url=str(request.base_url),
        )
    except MediaNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except MediaError as exc:
        raise _media_error(exc) from exc


@router.post("/background", response_model=MediaAssetResponse)
def background(
    request: Request,
    image: Annotated[UploadFile | None, File(description="Product photo")] = None,
    image_url: Annotated[str | None, Form(description="Public URL of the photo")] = None,
    prompt: Annotated[
        str | None, Form(description="Background scene; ignored when template_id is set")
    ] = None,
    template_id: Annotated[
        str | None, Form(description="Predefined template (see /media/background/templates)")
    ] = None,
    provider: MediaProvider = Depends(get_media_provider),
) -> MediaAssetResponse:
    try:
        data, content_type = _read_upload(image) if image else (None, None)
        return change_background(
            provider,
            image=data,
            content_type=content_type,
            image_url=image_url,
            prompt=prompt,
            template_id=template_id,
            base_url=str(request.base_url),
        )
    except MediaNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except MediaError as exc:
        raise _media_error(exc) from exc


@router.get("/background/templates")
def list_background_templates(
    provider: MediaProvider = Depends(get_media_provider),
) -> dict:
    try:
        return background_templates(provider)
    except MediaNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except MediaError as exc:
        raise _media_error(exc) from exc
