"""merge branched migration history

Revision ID: 8ea990a0e7a1
Revises: 4904b76d1ab1, 6435653fd434
Create Date: 2025-10-13 21:47:47.178278

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ea990a0e7a1'
down_revision: Union[str, Sequence[str], None] = ('4904b76d1ab1', '6435653fd434')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
