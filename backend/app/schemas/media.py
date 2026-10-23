"""Pydantic schemas for the media endpoints.

Request parameters arrive as multipart form fields (an uploaded image or
a public `image_url`, plus per-feature options) so the response models
here are the shared contract; the router declares the form fields.
"""

from enum import IntEnum
from typing import Literal

from pydantic import BaseModel

MediaKind = Literal["enhanced", "poster", "background"]

# Text-to-image fixed resolutions from the YouCam spec (image-to-image
# accepts any W*H with each side in [512, 2048] instead).
TextImageSize = Literal["1664*928", "1472*1104", "1328*1328", "1104*1472", "928*1664"]


class EnhanceScale(IntEnum):
    """Photo Enhance upscale ratios (YouCam spec: 1, 2 or 4)."""

    X1 = 1
    X2 = 2
    X4 = 4


class MediaAssetResponse(BaseModel):
    """A finished media asset, downloaded into our own storage.

    `url` is absolute and ready for <img src>; YouCam's own result URLs
    expire within ~2 hours so they are never exposed to clients.
    """

    kind: MediaKind
    url: str
    file_name: str
    provider: str
    task_id: str
    model: str | None = None
    source: Literal["upload", "url"] = "upload"
