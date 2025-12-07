"""Migrate to slot-based appointments

Revision ID: 20251024_slot_based
Revises: 66963282063a
Create Date: 2025-10-24 13:17:24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20251024_slot_based'
down_revision = '66963282063a'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migrate from session-based appointments to slot-based appointments
    """
    # 1. Add appointment_slot_id column to appointments table
    op.add_column('appointments', 
        sa.Column('appointment_slot_id', sa.Integer(), nullable=True)
    )
    
    # 2. Create foreign key constraint
    op.create_foreign_key(
        'fk_appointments_slot_id',
        'appointments', 'appointment_slots',
        ['appointment_slot_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # 3. Make appointment_session_id nullable (for backward compatibility)
    op.alter_column('appointments', 'appointment_session_id',
        existing_type=sa.Integer(),
        nullable=True
    )
    
    # 4. Remove unique constraint from appointment_session_id if it exists
    # Check if constraint exists first
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    constraints = [c['name'] for c in inspector.get_unique_constraints('appointments')]
    
    if 'appointments_appointment_session_id_key' in constraints:
        op.drop_constraint('appointments_appointment_session_id_key', 'appointments', type_='unique')
    
    # 5. Data migration: Create slots for existing appointments
    session = Session(bind=bind)
    
    # Get all appointments that don't have a slot yet
    result = session.execute(text("""
        SELECT a.id, a.appointment_session_id, s.start_time, s.end_time, s.doctor_user_id
        FROM appointments a
        JOIN appointment_sessions s ON a.appointment_session_id = s.id
        WHERE a.appointment_slot_id IS NULL
    """))
    
    appointments_to_migrate = result.fetchall()
    
    for appt_id, session_id, start_time, end_time, doctor_user_id in appointments_to_migrate:
        # Calculate duration in minutes
        duration_seconds = (end_time - start_time).total_seconds()
        duration_minutes = int(duration_seconds / 60)
        
        # Create a slot for this appointment
        slot_result = session.execute(text("""
            INSERT INTO appointment_slots 
            (session_id, start_time, end_time, duration, title, slot_type, modality, is_blocked, is_booked, created_at, updated_at)
            VALUES 
            (:session_id, :start_time, :end_time, :duration, 'Appointment', 'clinical', 'face_to_face', false, true, NOW(), NOW())
            RETURNING id
        """), {
            'session_id': session_id,
            'start_time': start_time,
            'end_time': end_time,
            'duration': duration_minutes
        })
        
        slot_id = slot_result.fetchone()[0]
        
        # Link appointment to the new slot
        session.execute(text("""
            UPDATE appointments
            SET appointment_slot_id = :slot_id
            WHERE id = :appt_id
        """), {
            'slot_id': slot_id,
            'appt_id': appt_id
        })
    
    session.commit()
    
    # 6. Make appointment_slot_id NOT NULL after data migration
    op.alter_column('appointments', 'appointment_slot_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    
    print(f"✅ Migrated {len(appointments_to_migrate)} appointments to slot-based system")


def downgrade():
    """
    Rollback to session-based appointments
    """
    # 1. Make appointment_session_id NOT NULL again
    op.alter_column('appointments', 'appointment_session_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    
    # 2. Restore unique constraint on appointment_session_id
    op.create_unique_constraint(
        'appointments_appointment_session_id_key',
        'appointments',
        ['appointment_session_id']
    )
    
    # 3. Remove foreign key constraint
    op.drop_constraint('fk_appointments_slot_id', 'appointments', type_='foreignkey')
    
    # 4. Remove appointment_slot_id column
    op.drop_column('appointments', 'appointment_slot_id')
    
    # Note: Slots created during migration will remain in the database
    # but won't be linked to appointments anymore
    
    print("✅ Rolled back to session-based appointments")
