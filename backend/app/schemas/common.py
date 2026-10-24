from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes; stored values are UTC
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# always serialized as UTC
UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]
