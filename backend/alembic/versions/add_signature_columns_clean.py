"""add signature columns to documents

Revision ID: add_signatures_001
Revises: 600d2fc88b76
Create Date: 2025-10-17 14:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_signatures_001'
down_revision: Union[str, Sequence[str], None] = '600d2fc88b76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add signature columns to discharge_summaries, handoff_notes, and patient_summaries"""
    
    from sqlalchemy import inspect
    from alembic import context
    
    conn = context.get_bind()
    inspector = inspect(conn)
    
    # Check if user_signatures table exists
    tables = inspector.get_table_names()
    
    # Add signature columns to discharge_summaries (only if they don't exist)
    discharge_cols = [c['name'] for c in inspector.get_columns('discharge_summaries')]
    if 'signed_by_doctor_id' not in discharge_cols:
        op.add_column('discharge_summaries', sa.Column('signed_by_doctor_id', sa.Integer(), nullable=True))
        op.add_column('discharge_summaries', sa.Column('signed_by_staff_id', sa.Integer(), nullable=True))
        op.add_column('discharge_summaries', sa.Column('signed_by_admin_id', sa.Integer(), nullable=True))
        op.add_column('discharge_summaries', sa.Column('doctor_signed_at', sa.DateTime(), nullable=True))
        op.add_column('discharge_summaries', sa.Column('staff_signed_at', sa.DateTime(), nullable=True))
        op.add_column('discharge_summaries', sa.Column('admin_signed_at', sa.DateTime(), nullable=True))
        
        op.create_foreign_key('discharge_summaries_signed_by_doctor_id_fkey', 'discharge_summaries', 'users', ['signed_by_doctor_id'], ['id'])
        op.create_foreign_key('discharge_summaries_signed_by_staff_id_fkey', 'discharge_summaries', 'users', ['signed_by_staff_id'], ['id'])
        op.create_foreign_key('discharge_summaries_signed_by_admin_id_fkey', 'discharge_summaries', 'users', ['signed_by_admin_id'], ['id'])
    
    # Add signature columns to handoff_notes (only if they don't exist)
    handoff_cols = [c['name'] for c in inspector.get_columns('handoff_notes')]
    if 'signed_by_doctor_id' not in handoff_cols:
        op.add_column('handoff_notes', sa.Column('signed_by_doctor_id', sa.Integer(), nullable=True))
        op.add_column('handoff_notes', sa.Column('signed_by_staff_id', sa.Integer(), nullable=True))
        op.add_column('handoff_notes', sa.Column('signed_by_admin_id', sa.Integer(), nullable=True))
        op.add_column('handoff_notes', sa.Column('doctor_signed_at', sa.DateTime(), nullable=True))
        op.add_column('handoff_notes', sa.Column('staff_signed_at', sa.DateTime(), nullable=True))
        op.add_column('handoff_notes', sa.Column('admin_signed_at', sa.DateTime(), nullable=True))
        
        op.create_foreign_key('handoff_notes_signed_by_doctor_id_fkey', 'handoff_notes', 'users', ['signed_by_doctor_id'], ['id'])
        op.create_foreign_key('handoff_notes_signed_by_staff_id_fkey', 'handoff_notes', 'users', ['signed_by_staff_id'], ['id'])
        op.create_foreign_key('handoff_notes_signed_by_admin_id_fkey', 'handoff_notes', 'users', ['signed_by_admin_id'], ['id'])
    
    # Add signature columns to patient_summaries (only if they don't exist)
    patient_summary_cols = [c['name'] for c in inspector.get_columns('patient_summaries')]
    if 'signed_by_doctor_id' not in patient_summary_cols:
        op.add_column('patient_summaries', sa.Column('signed_by_doctor_id', sa.Integer(), nullable=True))
        op.add_column('patient_summaries', sa.Column('signed_by_staff_id', sa.Integer(), nullable=True))
        op.add_column('patient_summaries', sa.Column('signed_by_admin_id', sa.Integer(), nullable=True))
        op.add_column('patient_summaries', sa.Column('doctor_signed_at', sa.DateTime(), nullable=True))
        op.add_column('patient_summaries', sa.Column('staff_signed_at', sa.DateTime(), nullable=True))
        op.add_column('patient_summaries', sa.Column('admin_signed_at', sa.DateTime(), nullable=True))
        
        op.create_foreign_key('patient_summaries_signed_by_doctor_id_fkey', 'patient_summaries', 'users', ['signed_by_doctor_id'], ['id'])
        op.create_foreign_key('patient_summaries_signed_by_staff_id_fkey', 'patient_summaries', 'users', ['signed_by_staff_id'], ['id'])
        op.create_foreign_key('patient_summaries_signed_by_admin_id_fkey', 'patient_summaries', 'users', ['signed_by_admin_id'], ['id'])
    
    # Create user_signatures table only if it doesn't exist
    if 'user_signatures' not in tables:
        op.create_table('user_signatures',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('signature_file_path', sa.String(), nullable=False),
            sa.Column('original_filename', sa.String(), nullable=True),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
            sa.Column('uploaded_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='user_signatures_user_id_fkey', ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id')
        )
        op.create_index('idx_user_signatures_user_id', 'user_signatures', ['user_id'])
        op.create_index('idx_user_signatures_active', 'user_signatures', ['is_active'])
    
    # Create patient_tasks table only if it doesn't exist
    if 'patient_tasks' not in tables:
        op.create_table('patient_tasks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('patient_user_id', sa.Integer(), nullable=False),
            sa.Column('task_description', sa.Text(), nullable=False),
            sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('created_by_user_id', sa.Integer(), nullable=False),
            sa.Column('task_group_id', sa.String(), nullable=False),
            sa.Column('task_order', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name='patient_tasks_created_by_user_id_fkey'),
            sa.ForeignKeyConstraint(['patient_user_id'], ['users.id'], name='patient_tasks_patient_user_id_fkey', ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_patient_tasks_patient_id', 'patient_tasks', ['patient_user_id'])
        op.create_index('idx_patient_tasks_group_id', 'patient_tasks', ['task_group_id'])


def downgrade() -> None:
    """Remove signature columns and tables"""
    
    # Drop patient_tasks table
    op.drop_index('idx_patient_tasks_group_id', table_name='patient_tasks')
    op.drop_index('idx_patient_tasks_patient_id', table_name='patient_tasks')
    op.drop_table('patient_tasks')
    
    # Drop user_signatures table
    op.drop_index('idx_user_signatures_active', table_name='user_signatures')
    op.drop_index('idx_user_signatures_user_id', table_name='user_signatures')
    op.drop_table('user_signatures')
    
    # Remove signature columns from patient_summaries
    op.drop_constraint('patient_summaries_signed_by_admin_id_fkey', 'patient_summaries', type_='foreignkey')
    op.drop_constraint('patient_summaries_signed_by_staff_id_fkey', 'patient_summaries', type_='foreignkey')
    op.drop_constraint('patient_summaries_signed_by_doctor_id_fkey', 'patient_summaries', type_='foreignkey')
    op.drop_column('patient_summaries', 'admin_signed_at')
    op.drop_column('patient_summaries', 'staff_signed_at')
    op.drop_column('patient_summaries', 'doctor_signed_at')
    op.drop_column('patient_summaries', 'signed_by_admin_id')
    op.drop_column('patient_summaries', 'signed_by_staff_id')
    op.drop_column('patient_summaries', 'signed_by_doctor_id')
    
    # Remove signature columns from handoff_notes
    op.drop_constraint('handoff_notes_signed_by_admin_id_fkey', 'handoff_notes', type_='foreignkey')
    op.drop_constraint('handoff_notes_signed_by_staff_id_fkey', 'handoff_notes', type_='foreignkey')
    op.drop_constraint('handoff_notes_signed_by_doctor_id_fkey', 'handoff_notes', type_='foreignkey')
    op.drop_column('handoff_notes', 'admin_signed_at')
    op.drop_column('handoff_notes', 'staff_signed_at')
    op.drop_column('handoff_notes', 'doctor_signed_at')
    op.drop_column('handoff_notes', 'signed_by_admin_id')
    op.drop_column('handoff_notes', 'signed_by_staff_id')
    op.drop_column('handoff_notes', 'signed_by_doctor_id')
    
    # Remove signature columns from discharge_summaries
    op.drop_constraint('discharge_summaries_signed_by_admin_id_fkey', 'discharge_summaries', type_='foreignkey')
    op.drop_constraint('discharge_summaries_signed_by_staff_id_fkey', 'discharge_summaries', type_='foreignkey')
    op.drop_constraint('discharge_summaries_signed_by_doctor_id_fkey', 'discharge_summaries', type_='foreignkey')
    op.drop_column('discharge_summaries', 'admin_signed_at')
    op.drop_column('discharge_summaries', 'staff_signed_at')
    op.drop_column('discharge_summaries', 'doctor_signed_at')
    op.drop_column('discharge_summaries', 'signed_by_admin_id')
    op.drop_column('discharge_summaries', 'signed_by_staff_id')
    op.drop_column('discharge_summaries', 'signed_by_doctor_id')
