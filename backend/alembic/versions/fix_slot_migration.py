"""Fix slot migration with proper data handling

Revision ID: fix_slot_migration
Revises: add_signatures_001
Create Date: 2025-10-20 18:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'fix_slot_migration'
down_revision = 'add_signatures_001'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade schema with proper handling of existing data."""
    
    # Step 1: Add new columns as NULLABLE first
    op.add_column('appointment_sessions', sa.Column('name', sa.String(), nullable=True))
    op.add_column('appointment_sessions', sa.Column('session_type', sa.String(), nullable=True))
    op.add_column('appointment_sessions', sa.Column('is_recurring', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('appointment_sessions', sa.Column('recurrence_group_id', sa.String(), nullable=True))
    op.add_column('appointment_sessions', sa.Column('parent_session_id', sa.Integer(), nullable=True))
    op.add_column('appointment_sessions', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('appointment_sessions', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Step 2: Update existing rows with default values
    op.execute("""
        UPDATE appointment_sessions 
        SET 
            name = 'Legacy Slot',
            session_type = 'ON_SITE',
            is_recurring = false,
            created_at = NOW(),
            updated_at = NOW()
        WHERE name IS NULL
    """)
    
    # Step 3: Enum types already exist, skip creation
    # op.execute("CREATE TYPE slottype AS ENUM ('ON_SITE', 'OFF_SITE')")
    # op.execute("CREATE TYPE slotstatus AS ENUM ('AVAILABLE', 'BOOKED', 'CANCELLED', 'BLOCKED')")
    
    # Step 4: Convert status column from VARCHAR to enum
    # First, update any non-standard values
    op.execute("""
        UPDATE appointment_sessions 
        SET status = CASE 
            WHEN UPPER(status) = 'AVAILABLE' THEN 'AVAILABLE'
            WHEN UPPER(status) = 'BOOKED' THEN 'BOOKED'
            WHEN UPPER(status) = 'CANCELLED' THEN 'CANCELLED'
            WHEN UPPER(status) = 'BLOCKED' THEN 'BLOCKED'
            ELSE 'AVAILABLE'
        END
    """)
    
    # Convert status column using USING clause
    op.execute("ALTER TABLE appointment_sessions ALTER COLUMN status TYPE slotstatus USING status::slotstatus")
    
    # Step 5: Convert session_type column to enum
    op.execute("ALTER TABLE appointment_sessions ALTER COLUMN session_type TYPE slottype USING session_type::slottype")
    
    # Step 6: Make columns NOT NULL after data is populated
    op.alter_column('appointment_sessions', 'name', nullable=False)
    op.alter_column('appointment_sessions', 'session_type', nullable=False)
    op.alter_column('appointment_sessions', 'created_at', nullable=False)
    op.alter_column('appointment_sessions', 'status', nullable=False)
    op.alter_column('appointment_sessions', 'doctor_user_id', nullable=False)
    op.alter_column('appointment_sessions', 'start_time', nullable=False)
    op.alter_column('appointment_sessions', 'end_time', nullable=False)
    
    # Step 7: Create indexes
    op.create_index('ix_appointment_sessions_doctor_user_id', 'appointment_sessions', ['doctor_user_id'])
    op.create_index('ix_appointment_sessions_recurrence_group_id', 'appointment_sessions', ['recurrence_group_id'])
    op.create_index('ix_appointment_sessions_start_time', 'appointment_sessions', ['start_time'])
    op.create_index('ix_appointment_sessions_status', 'appointment_sessions', ['status'])
    
    # Step 8: Add foreign key for parent_session_id
    op.create_foreign_key(
        'fk_appointment_sessions_parent_session',
        'appointment_sessions', 'appointment_sessions',
        ['parent_session_id'], ['id']
    )


def downgrade():
    """Downgrade schema."""
    
    # Drop foreign key
    op.drop_constraint('fk_appointment_sessions_parent_session', 'appointment_sessions', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('ix_appointment_sessions_status', 'appointment_sessions')
    op.drop_index('ix_appointment_sessions_start_time', 'appointment_sessions')
    op.drop_index('ix_appointment_sessions_recurrence_group_id', 'appointment_sessions')
    op.drop_index('ix_appointment_sessions_doctor_user_id', 'appointment_sessions')
    
    # Convert status back to VARCHAR
    op.execute("ALTER TABLE appointment_sessions ALTER COLUMN status TYPE VARCHAR")
    
    # Drop columns
    op.drop_column('appointment_sessions', 'updated_at')
    op.drop_column('appointment_sessions', 'created_at')
    op.drop_column('appointment_sessions', 'parent_session_id')
    op.drop_column('appointment_sessions', 'recurrence_group_id')
    op.drop_column('appointment_sessions', 'is_recurring')
    op.drop_column('appointment_sessions', 'session_type')
    op.drop_column('appointment_sessions', 'name')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS slotstatus")
    op.execute("DROP TYPE IF EXISTS slottype")
    
    # Make columns nullable again
    op.alter_column('appointment_sessions', 'end_time', nullable=True)
    op.alter_column('appointment_sessions', 'start_time', nullable=True)
    op.alter_column('appointment_sessions', 'doctor_user_id', nullable=True)
