"""add patient summaries table

Revision ID: 600d2fc88b76
Revises: a1f6002408c7
Create Date: 2025-10-16 16:30:30.336242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '600d2fc88b76'
down_revision: Union[str, Sequence[str], None] = 'a1f6002408c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - only create patient_summaries table."""
    # Create patient_summaries table
    op.create_table('patient_summaries',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('patient_user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('doctor_user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('hospital_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('title', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('summary_date', sa.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('ai_generated_summary', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('what_we_found', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('what_it_means', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('your_diagnosis', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('your_treatment_plan', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('your_medications', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('what_to_watch_for', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('next_steps', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('lifestyle_tips', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('questions_to_ask', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('doctor_notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('special_instructions', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('patient_context_snapshot', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('pdf_file_path', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('word_file_path', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('is_viewed_by_patient', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('viewed_at', sa.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('acknowledged_by_staff_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['doctor_user_id'], ['users.id'], name=op.f('patient_summaries_doctor_user_id_fkey')),
    sa.ForeignKeyConstraint(['hospital_id'], ['hospitals.id'], name=op.f('patient_summaries_hospital_id_fkey')),
    sa.ForeignKeyConstraint(['patient_user_id'], ['users.id'], name=op.f('patient_summaries_patient_user_id_fkey')),
    sa.PrimaryKeyConstraint('id', name=op.f('patient_summaries_pkey'))
    )
    op.create_index(op.f('ix_patient_summaries_id'), 'patient_summaries', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_patient_summaries_id'), table_name='patient_summaries')
    op.drop_table('patient_summaries')
