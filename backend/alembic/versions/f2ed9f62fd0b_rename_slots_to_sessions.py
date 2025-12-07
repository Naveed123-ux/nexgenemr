"""Rename slots to sessions

Revision ID: f2ed9f62fd0b
Revises: fix_slot_migration
Create Date: 2025-10-21 13:57:16.993235

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2ed9f62fd0b'
down_revision: Union[str, Sequence[str], None] = 'fix_slot_migration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Rename tables
    op.rename_table('appointment_slots', 'appointment_sessions')
    op.rename_table('slot_recurrence_patterns', 'session_recurrence_patterns')
    
    # Rename columns
    op.alter_column('appointment_sessions', 'slot_type', new_column_name='session_type')
    op.alter_column('appointment_sessions', 'parent_slot_id', new_column_name='parent_session_id')
    op.alter_column('session_recurrence_patterns', 'slot_type', new_column_name='session_type')
    op.alter_column('appointments', 'appointment_slot_id', new_column_name='appointment_session_id')

def downgrade():
    # Reverse the changes
    op.alter_column('appointments', 'appointment_session_id', new_column_name='appointment_slot_id')
    op.alter_column('session_recurrence_patterns', 'session_type', new_column_name='slot_type')
    op.alter_column('appointment_sessions', 'parent_session_id', new_column_name='parent_slot_id')
    op.alter_column('appointment_sessions', 'session_type', new_column_name='slot_type')
    op.rename_table('session_recurrence_patterns', 'slot_recurrence_patterns')
    op.rename_table('appointment_sessions', 'appointment_slots')