"""Add appointment_slots table

Revision ID: 66963282063a
Revises: 6525570387d6
Create Date: 2025-10-21 15:15:19.891350

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66963282063a'
down_revision: Union[str, Sequence[str], None] = '6525570387d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add appointment_slots table."""
    # Create appointment_slots table if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            -- Create slottype enum if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slottype') THEN
                CREATE TYPE slottype AS ENUM ('CLINICAL', 'CLINICAL_ADMIN', 'BREAK', 'UNALLOCATED');
            END IF;
            
            -- Create appointment_slots table if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointment_slots') THEN
                CREATE TABLE public.appointment_slots (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP NOT NULL,
                    duration INTEGER NOT NULL,
                    title VARCHAR,
                    label VARCHAR,
                    slot_color VARCHAR,
                    slot_type slottype NOT NULL,
                    modality VARCHAR,
                    is_blocked BOOLEAN DEFAULT FALSE,
                    is_booked BOOLEAN DEFAULT FALSE,
                    appointment_id INTEGER UNIQUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    CONSTRAINT fk_appointment_slots_session_id FOREIGN KEY (session_id) REFERENCES public.appointment_sessions(id) ON DELETE CASCADE,
                    CONSTRAINT fk_appointment_slots_appointment_id FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL
                );
                
                -- Create indexes
                CREATE INDEX IF NOT EXISTS ix_public_appointment_slots_id ON public.appointment_slots(id);
                CREATE INDEX IF NOT EXISTS ix_public_appointment_slots_session_id ON public.appointment_slots(session_id);
                CREATE INDEX IF NOT EXISTS ix_public_appointment_slots_start_time ON public.appointment_slots(start_time);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('appointment_slots')
    op.execute('DROP TYPE IF EXISTS slottype')
