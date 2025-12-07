"""add claims table

Revision ID: 648870152f8b
Revises: b85217a872bc
Create Date: 2025-10-14 17:53:59.255020

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '648870152f8b'
down_revision: Union[str, Sequence[str], None] = 'b85217a872bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
