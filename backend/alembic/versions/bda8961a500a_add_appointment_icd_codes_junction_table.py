"""add_appointment_icd_codes_junction_table

Revision ID: bda8961a500a
Revises: 9c53774769dd
Create Date: 2025-10-16 12:55:27.858470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bda8961a500a'
down_revision: Union[str, Sequence[str], None] = '9c53774769dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create appointment_icd_codes junction table
    op.create_table(
        'appointment_icd_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('icd_code_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('added_by_user_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['icd_code_id'], ['icd_codes.id']),
        sa.ForeignKeyConstraint(['added_by_user_id'], ['users.id'])
    )
    op.create_index('ix_appointment_icd_codes_appointment_id', 'appointment_icd_codes', ['appointment_id'])
    op.create_index('ix_appointment_icd_codes_icd_code_id', 'appointment_icd_codes', ['icd_code_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_appointment_icd_codes_icd_code_id', table_name='appointment_icd_codes')
    op.drop_index('ix_appointment_icd_codes_appointment_id', table_name='appointment_icd_codes')
    op.drop_table('appointment_icd_codes')
