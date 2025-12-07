"""Rename slottype enum to sessiontype

Revision ID: 6525570387d6
Revises: f2ed9f62fd0b
Create Date: 2025-10-21 14:35:40.431918

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6525570387d6'
down_revision: Union[str, Sequence[str], None] = 'f2ed9f62fd0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # First, alter the columns to use the new enum type (if sessiontype already exists)
    # This handles the case where SQLAlchemy already created the new enum
    
    # Check if slottype exists and sessiontype exists
    op.execute("""
        DO $$
        BEGIN
            -- If both types exist, we need to migrate the data
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slottype') 
               AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sessiontype') THEN
                
                -- Update appointment_sessions table
                ALTER TABLE appointment_sessions 
                    ALTER COLUMN session_type TYPE sessiontype 
                    USING session_type::text::sessiontype;
                
                -- Update session_recurrence_patterns table
                ALTER TABLE session_recurrence_patterns 
                    ALTER COLUMN session_type TYPE sessiontype 
                    USING session_type::text::sessiontype;
                
                -- Drop the old enum type
                DROP TYPE slottype;
                
            -- If only slottype exists, just rename it
            ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slottype') THEN
                ALTER TYPE slottype RENAME TO sessiontype;
            END IF;
            
            -- Handle status enum similarly
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slotstatus') 
               AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sessionstatus') THEN
                
                ALTER TABLE appointment_sessions 
                    ALTER COLUMN status TYPE sessionstatus 
                    USING status::text::sessionstatus;
                
                DROP TYPE slotstatus;
                
            ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slotstatus') THEN
                ALTER TYPE slotstatus RENAME TO sessionstatus;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Reverse the changes
    op.execute("ALTER TYPE sessionstatus RENAME TO slotstatus")
    op.execute("ALTER TYPE sessiontype RENAME TO slottype")
