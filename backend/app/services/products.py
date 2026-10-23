"""Product services: saving uploads and understanding the photo."""

import base64
import secrets
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy.orm import Session

from app.adapters.llm import LLMProvider
from app.config import Settings
from app.models import AppUser, MediaAsset, Product
from app.schemas.products import Understood
from app.services.activity import log_activity
from app.services.media import MAX_IMAGE_BYTES

AI_ACTOR = "eViral AI"

_IMAGE_TYPES = {
    "image/jpeg": ("image/jpeg", ".jpg"),
    "image/jpg": ("image/jpeg", ".jpg"),
    "image/png": ("image/png", ".png"),
}


class ProductInputError(ValueError):
    """Owner input that we can't accept (maps to 422)."""


def parse_price(raw: str | None) -> Decimal | None:
    """Empty means no price. Otherwise a number >= 0 with at most 2 decimals."""
    if raw is None or not raw.strip():
        return None
    try:
        price = Decimal(raw.strip())
    except InvalidOperation as exc:
        raise ProductInputError("price must be a number") from exc
    if not price.is_finite() or price < 0:
        raise ProductInputError("price must be 0 or more")
    if price.as_tuple().exponent < -2:
        raise ProductInputError("price can have at most 2 decimal places")
    if price >= Decimal("100000000"):
        raise ProductInputError("price is too large")
    return price.quantize(Decimal("0.01"))


def check_photo(data: bytes, content_type: str | None) -> tuple[str, str]:
    """Return (mime, extension) for a jpg/png photo up to 10MB."""
    if not data:
        raise ProductInputError("photo is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise ProductInputError("photo must be 10MB or smaller")
    known = _IMAGE_TYPES.get((content_type or "").lower())
    is_png = data[:8] == b"\x89PNG\r\n\x1a\n"
    is_jpg = data[:3] == b"\xff\xd8\xff"
    if known is None or not (is_png or is_jpg):
        raise ProductInputError("photo must be a JPG or PNG image")
    # Trust the file contents over the declared type.
    return ("image/png", ".png") if is_png else ("image/jpeg", ".jpg")


def create_product(
    db: Session,
    user: AppUser,
    settings: Settings,
    *,
    name: str,
    price: Decimal | None,
    note: str | None,
    photo: bytes,
    content_type: str | None,
) -> Product:
    mime, ext = check_photo(photo, content_type)

    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"original_{secrets.token_hex(8)}{ext}"
    file_path = media_dir / file_name
    file_path.write_bytes(photo)

    asset = MediaAsset(
        business_id=user.business_id,
        kind="original",
        path=str(file_path),
        url=f"/media/{file_name}",
        mime=mime,
        provider="upload",
    )
    db.add(asset)
    db.flush()

    product = Product(
        business_id=user.business_id,
        name=name,
        price_myr=price,
        note=note,
        original_asset_id=asset.id,
    )
    db.add(product)
    db.flush()
    log_activity(
        db,
        action="draft",
        entity_type="product",
        entity_id=product.id,
        summary=f"Product added: {name}",
        actor=user.name,
        business_id=user.business_id,
    )
    db.commit()
    return product


UNDERSTAND_PROMPT = """You look at one product photo for a small Malaysian business.
Describe ONLY what is clearly visible in the photo. Do not guess flavour,
ingredients, size, weight, price, brand, certifications or origin; list those
under "uncertain" instead. The owner's product name is given for context only;
do not copy claims from the name unless you can see them.
Write visible_attributes as short chips of 2-4 words (e.g. "golden brown top",
"layered pattern", "sliced on a plate"), at most 6.
Respond with JSON only, exactly this shape:
{"product_type": "...", "visible_attributes": ["..."],
 "suggested_category": "...", "uncertain": ["..."]}"""


def understand_product(
    db: Session, product: Product, provider: LLMProvider
) -> Product:
    """Run the vision model on the product photo and store the result."""
    asset = product.original_asset
    data = Path(asset.path).read_bytes()
    data_url = f"data:{asset.mime};base64,{base64.b64encode(data).decode()}"
    text = f"Product name from the owner: {product.name}"

    result, model = provider.vision_json(
        UNDERSTAND_PROMPT, text, data_url, Understood.model_validate
    )

    product.understood = result.model_dump()
    product.understood_model = model
    product.confirmed_attributes = None
    product.understood_confirmed = False
    log_activity(
        db,
        action="generated",
        entity_type="product",
        entity_id=product.id,
        summary="Photo analysed",
        actor=AI_ACTOR,
        business_id=product.business_id,
        detail={"model": model, "product_name": product.name},
    )
    db.commit()
    return product


def confirm_attributes(db: Session, product: Product, attributes: list[str]) -> Product:
    product.confirmed_attributes = attributes
    product.understood_confirmed = True
    db.commit()
    return product
