from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes; everything we store is UTC.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# Datetime that is always sent as UTC ("...Z").
UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]
