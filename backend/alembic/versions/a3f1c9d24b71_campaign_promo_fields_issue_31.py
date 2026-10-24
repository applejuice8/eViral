"""campaign promo fields (issue 31)

Revision ID: a3f1c9d24b71
Revises: 9c8b27dbe380
Create Date: 2026-10-24 21:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f1c9d24b71'
down_revision: Union[str, Sequence[str], None] = '9c8b27dbe380'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('campaign', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('campaign_type', sa.String(length=20),
                      nullable=False, server_default='new_product')
        )
        batch_op.add_column(sa.Column('promo_kind', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('discount_percent', sa.Numeric(5, 2), nullable=True))
        batch_op.add_column(sa.Column('promo_price_myr', sa.Numeric(10, 2), nullable=True))
        batch_op.add_column(sa.Column('promo_note', sa.String(length=140), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('campaign', schema=None) as batch_op:
        batch_op.drop_column('promo_note')
        batch_op.drop_column('promo_price_myr')
        batch_op.drop_column('discount_percent')
        batch_op.drop_column('promo_kind')
        batch_op.drop_column('campaign_type')