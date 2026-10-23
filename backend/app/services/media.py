"""Media service: orchestrates YouCam tasks and stores results locally.

Every operation follows the same lifecycle (TECHNICAL_IMPLEMENTATION
§8): resolve the source (upload bytes via the File API, or pass a public
`src_file_url` straight to the task) -> submit the async task -> poll to
success -> download the result immediately into MEDIA_DIR (result URLs
expire in ~2 hours and YouCam deletes everything within ~24 hours).

A pipeline must never fail *because* media failed, so this service raises
MediaError for the router to map; callers can fall back to the original
image later per BACKEND_PLAN F8.
"""

import re
import secrets
from pathlib import Path

from app.adapters.media import MediaError, MediaProvider, MediaTask
from app.config import Settings, get_settings
from app.schemas.media import MediaAssetResponse

# YouCam file specs (docs.perfectcorp.com): jpg/jpeg/png, < 10MB.
MAX_IMAGE_BYTES = 10 * 1024 * 1024
# The File API examples use "image/jpg" (not "image/jpeg").
_SUPPORTED_TYPES: dict[str, str] = {
    "image/jpg": ("image/jpg", ".jpg"),
    "image/jpeg": ("image/jpg", ".jpg"),
    "image/png": ("image/png", ".png"),
}

_IMAGE_TO_IMAGE_SIZE_RE = re.compile(r"^(\d{3,4})\*(\d{3,4})$")


def parse_image_to_image_size(size: str) -> str:
    """Validate an image-to-image size string: 'W*H', each side in [512, 2048]."""
    match = _IMAGE_TO_IMAGE_SIZE_RE.match(size)
    if not match:
        raise MediaError(f"size must look like '1024*1024', got {size!r}")
    width, height = int(match[1]), int(match[2])
    if not (512 <= width <= 2048 and 512 <= height <= 2048):
        raise MediaError(f"size sides must be 512-2048 pixels, got {size!r}")
    return size


def validate_image(data: bytes, content_type: str) -> str:
    """Check YouCam's input rules; return the normalized extension."""
    if not data:
        raise MediaError("uploaded image is empty")
    normalized = _SUPPORTED_TYPES.get((content_type or "").lower())
    if normalized is None:
        raise MediaError(
            f"unsupported image type {content_type!r} — use jpg/jpeg or png"
        )
    if len(data) > MAX_IMAGE_BYTES:
        raise MediaError(
            f"image is {len(data)} bytes — YouCam accepts up to 10MB"
        )
    return normalized[1]


def _resolve_source(
    provider: MediaProvider,
    *,
    image: bytes | None,
    content_type: str | None,
    image_url: str | None,
) -> tuple[dict, str]:
    """Turn the caller's input into task source fields.

    Exactly one of an uploaded file or a public URL must be given.
    Returns (source fields for the task payload, "upload" | "url").
    """
    if image is not None and image_url:
        raise MediaError("provide either an image file or image_url, not both")
    if image is None and not image_url:
        raise MediaError("provide an image file or an image_url")

    if image is not None:
        ext = validate_image(image, content_type or "")
        file_name = f"upload_{secrets.token_hex(4)}{ext}"
        file_id = provider.upload_image(image, file_name, (content_type or "").lower())
        return {"src_file_id": file_id}, "upload"
    return {"src_file_url": image_url}, "url"


def _sniff_ext(data: bytes) -> str:
    """Result images are jpg or png; pick the extension from magic bytes."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    return ".jpg"


def _persist(
    provider: MediaProvider,
    task: MediaTask,
    settings: Settings,
    kind: str,
) -> tuple[str, str]:
    """Poll the task to success, download the result, store it locally."""
    result_url = provider.wait_for_result_url(task)
    data = provider.download(result_url)
    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{kind}_{secrets.token_hex(8)}{_sniff_ext(data)}"
    (media_dir / file_name).write_bytes(data)
    return file_name, f"/media/{file_name}"


def save_result(
    provider: MediaProvider, task: MediaTask, settings: Settings, kind: str
) -> tuple[str, str]:
    """Wait for a submitted task and store its image. Returns (file name, /media URL)."""
    return _persist(provider, task, settings, kind)


def _respond(
    *,
    kind: str,
    file_name: str,
    url_path: str,
    provider: MediaProvider,
    task: MediaTask,
    model: str | None,
    source: str,
    base_url: str,
) -> MediaAssetResponse:
    return MediaAssetResponse(
        kind=kind,
        url=f"{base_url.rstrip('/')}{url_path}",
        file_name=file_name,
        provider=provider.name,
        task_id=task.task_id,
        model=model,
        source=source,  # type: ignore[arg-type]
    )


# -- feature operations -----------------------------------------------------


def enhance_image(
    provider: MediaProvider,
    *,
    image: bytes | None = None,
    content_type: str | None = None,
    image_url: str | None = None,
    scale: int = 1,
    base_url: str = "http://localhost:8000",
    settings: Settings | None = None,
) -> MediaAssetResponse:
    settings = settings or get_settings()
    source, origin = _resolve_source(
        provider, image=image, content_type=content_type, image_url=image_url
    )
    task = provider.submit_enhance(scale=scale, **source)
    file_name, url_path = _persist(provider, task, settings, "enhanced")
    return _respond(
        kind="enhanced",
        file_name=file_name,
        url_path=url_path,
        provider=provider,
        task=task,
        model=None,
        source=origin,
        base_url=base_url,
    )


def generate_poster_from_image(
    provider: MediaProvider,
    *,
    image: bytes | None = None,
    content_type: str | None = None,
    image_url: str | None = None,
    prompt: str = "",
    negative_prompt: str | None = None,
    size: str | None = None,
    base_url: str = "http://localhost:8000",
    settings: Settings | None = None,
) -> MediaAssetResponse:
    """Image-to-image: build a poster scene around the real product photo."""
    if not prompt.strip():
        raise MediaError("poster generation needs a prompt describing the scene")
    settings = settings or get_settings()
    source, origin = _resolve_source(
        provider, image=image, content_type=content_type, image_url=image_url
    )
    if "src_file_id" in source:
        submit_kwargs: dict = {"src_file_ids": [source["src_file_id"]]}
    else:
        submit_kwargs = {"src_file_urls": [source["src_file_url"]]}
    if size:
        submit_kwargs["size"] = parse_image_to_image_size(size)
    task = provider.submit_poster_from_image(
        prompt=prompt, negative_prompt=negative_prompt, **submit_kwargs
    )
    file_name, url_path = _persist(provider, task, settings, "poster")
    return _respond(
        kind="poster",
        file_name=file_name,
        url_path=url_path,
        provider=provider,
        task=task,
        model=settings.youcam_image_model,
        source=origin,
        base_url=base_url,
    )


def generate_poster_from_text(
    provider: MediaProvider,
    *,
    prompt: str = "",
    negative_prompt: str | None = None,
    size: str | None = None,
    base_url: str = "http://localhost:8000",
    settings: Settings | None = None,
) -> MediaAssetResponse:
    """Text-to-image: poster from a prompt only (no product photo)."""
    if not prompt.strip():
        raise MediaError("poster generation needs a prompt")
    settings = settings or get_settings()
    task = provider.submit_poster_from_text(
        prompt=prompt, negative_prompt=negative_prompt, size=size
    )
    file_name, url_path = _persist(provider, task, settings, "poster")
    return _respond(
        kind="poster",
        file_name=file_name,
        url_path=url_path,
        provider=provider,
        task=task,
        model=settings.youcam_image_model,
        source="url",
        base_url=base_url,
    )


def change_background(
    provider: MediaProvider,
    *,
    image: bytes | None = None,
    content_type: str | None = None,
    image_url: str | None = None,
    prompt: str | None = None,
    template_id: str | None = None,
    base_url: str = "http://localhost:8000",
    settings: Settings | None = None,
) -> MediaAssetResponse:
    settings = settings or get_settings()
    source, origin = _resolve_source(
        provider, image=image, content_type=content_type, image_url=image_url
    )
    task = provider.submit_background_change(
        prompt=prompt, template_id=template_id, **source
    )
    file_name, url_path = _persist(provider, task, settings, "background")
    return _respond(
        kind="background",
        file_name=file_name,
        url_path=url_path,
        provider=provider,
        task=task,
        model=None,
        source=origin,
        base_url=base_url,
    )


def background_templates(provider: MediaProvider) -> dict:
    """Predefined background templates, passed through from YouCam."""
    return provider.list_background_templates()
