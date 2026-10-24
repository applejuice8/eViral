from enum import IntEnum
from typing import Literal

from pydantic import BaseModel

MediaKind = Literal["enhanced", "poster", "background"]

# fixed resolutions from the YouCam spec
TextImageSize = Literal["1664*928", "1472*1104", "1328*1328", "1104*1472", "928*1664"]


class EnhanceScale(IntEnum):
    X1 = 1
    X2 = 2
    X4 = 4


class MediaAssetResponse(BaseModel):
    kind: MediaKind
    url: str
    file_name: str
    provider: str
    task_id: str
    model: str | None = None
    source: Literal["upload", "url"] = "upload"
