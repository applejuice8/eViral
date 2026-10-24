from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UTCDateTime

MAX_ATTRIBUTES = 6


def _clean_chips(values: list[str], limit: int) -> list[str]:
    chips: list[str] = []
    for value in values:
        chip = " ".join(str(value).split())
        if chip and chip.lower() not in (c.lower() for c in chips):
            chips.append(chip)
    return chips[:limit]


class Understood(BaseModel):
    product_type: str = Field(min_length=1)
    visible_attributes: list[str] = Field(min_length=1)
    suggested_category: str = ""
    # things the photo can't tell
    uncertain: list[str] = []

    @field_validator("visible_attributes")
    @classmethod
    def _attributes(cls, v: list[str]) -> list[str]:
        chips = _clean_chips(v, MAX_ATTRIBUTES)
        if not chips:
            raise ValueError("no visible attributes")
        return chips

    @field_validator("uncertain")
    @classmethod
    def _uncertain(cls, v: list[str]) -> list[str]:
        return _clean_chips(v, MAX_ATTRIBUTES)


class ConfirmAttributesRequest(BaseModel):
    attributes: list[str] = Field(max_length=12)

    @field_validator("attributes")
    @classmethod
    def _attributes(cls, v: list[str]) -> list[str]:
        if any(len(a) > 60 for a in v):
            raise ValueError("attributes must be 60 characters or less")
        return _clean_chips(v, 12)


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price_myr: Decimal | None
    note: str | None
    photo_url: str
    understood: Understood | None
    confirmed_attributes: list[str] | None
    understood_confirmed: bool
    understood_model: str | None
    created_at: UTCDateTime
