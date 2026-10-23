from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.llm import LLMError, LLMProvider, get_llm_provider
from app.config import get_settings
from app.db import get_db
from app.deps import current_user
from app.models import AppUser, Product
from app.schemas.products import ConfirmAttributesRequest, ProductResponse
from app.services.products import (
    ProductInputError,
    confirm_attributes,
    create_product,
    parse_price,
    understand_product,
)

router = APIRouter(prefix="/products", tags=["products"])


def to_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        price_myr=product.price_myr,
        note=product.note,
        photo_url=product.original_asset.url,
        understood=product.understood,
        confirmed_attributes=product.confirmed_attributes,
        understood_confirmed=product.understood_confirmed,
        understood_model=product.understood_model,
        created_at=product.created_at,
    )


def get_product(product_id: int, db: Session, user: AppUser) -> Product:
    product = db.get(Product, product_id)
    if product is None or product.business_id != user.business_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create(
    name: Annotated[str, Form(max_length=80)],
    photo: Annotated[UploadFile, File(description="Product photo (jpg/png, 10MB max)")],
    price: Annotated[str | None, Form(description="Price in RM, e.g. 65 or 65.00")] = None,
    note: Annotated[str | None, Form(max_length=140)] = None,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> ProductResponse:
    """Save a new product and its original photo."""
    name = name.strip()
    note = (note or "").strip() or None
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "name is required")
    try:
        product = create_product(
            db,
            user,
            get_settings(),
            name=name,
            price=parse_price(price),
            note=note,
            photo=photo.file.read(),
            content_type=photo.content_type,
        )
    except ProductInputError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    return to_response(product)


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db), user: AppUser = Depends(current_user)
) -> list[ProductResponse]:
    """All products of the business, newest first."""
    products = db.scalars(
        select(Product)
        .where(Product.business_id == user.business_id)
        .order_by(Product.created_at.desc(), Product.id.desc())
    )
    return [to_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
def read(
    product_id: int,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> ProductResponse:
    return to_response(get_product(product_id, db, user))


@router.post("/{product_id}/understand", response_model=ProductResponse)
def understand(
    product_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
    provider: LLMProvider = Depends(get_llm_provider),
) -> ProductResponse:
    """Describe what is visible in the photo (vision model).

    The result is cached on the product; pass `?force=true` to run it again
    (this also clears any confirmed attributes).
    """
    product = get_product(product_id, db, user)
    if product.understood is not None and not force:
        return to_response(product)
    try:
        product = understand_product(db, product, provider)
    except LLMError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Photo understanding failed: {exc}"
        ) from exc
    return to_response(product)


@router.patch("/{product_id}/understood", response_model=ProductResponse)
def confirm(
    product_id: int,
    body: ConfirmAttributesRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> ProductResponse:
    """Save the attributes the owner confirmed (the edited chips)."""
    product = get_product(product_id, db, user)
    return to_response(confirm_attributes(db, product, body.attributes))
