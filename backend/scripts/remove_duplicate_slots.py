"""
Script to remove duplicate appointment slots, keeping only one instance of each
Strategy: Keep the slot that has an appointment booked, or the first one if none are booked
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func
from db.db import SessionLocal
from models.appointment_slot_model import AppointmentSlot
from models.appointment_model import Appointment

def remove_duplicate_slots():
    db = SessionLocal()
    try:
        print("🔍 Finding duplicate appointment slots...\n")
        
        # Find IDs that appear more than once
        duplicates = db.query(
            AppointmentSlot.id,
            func.count(AppointmentSlot.id).label('count')
        ).group_by(AppointmentSlot.id).having(func.count(AppointmentSlot.id) > 1).all()
        
        if not duplicates:
            print("✅ No duplicate slot IDs found!")
            return
        
        print(f"❌ Found {len(duplicates)} duplicate slot IDs\n")
        
        total_removed = 0
        
        for slot_id, count in duplicates:
            print(f"Processing Slot ID {slot_id} ({count} duplicates)...")
            
            # Get all instances of this slot
            slots = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).all()
            
            # Check which ones have appointments
            slots_with_appointments = []
            slots_without_appointments = []
            
            for slot in slots:
                has_appointment = db.query(Appointment).filter(
                    Appointment.appointment_slot_id == slot_id
                ).first() is not None
                
                if has_appointment:
                    slots_with_appointments.append(slot)
                else:
                    slots_without_appointments.append(slot)
            
            # Decide which to keep
            if slots_with_appointments:
                # Keep the first one with an appointment
                keep_slot = slots_with_appointments[0]
                remove_slots = slots_with_appointments[1:] + slots_without_appointments
                print(f"  ✓ Keeping slot with appointment")
            else:
                # Keep the first one
                keep_slot = slots[0]
                remove_slots = slots[1:]
                print(f"  ✓ Keeping first slot (none have appointments)")
            
            # Remove duplicates using raw SQL to avoid SQLAlchemy tracking issues
            for slot in remove_slots:
                # Get the internal row ID (ctid in PostgreSQL or rowid in SQLite)
                db.execute(
                    f"DELETE FROM appointment_slots WHERE ctid = (SELECT ctid FROM appointment_slots WHERE id = {slot_id} LIMIT 1 OFFSET 1)"
                )
                total_removed += 1
            
            print(f"  ✓ Removed {len(remove_slots)} duplicate(s)\n")
        
        db.commit()
        print(f"\n✅ Successfully removed {total_removed} duplicate slots!")
        print("⚠️  Please verify your data and restart your application.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    response = input("⚠️  This will permanently delete duplicate slots. Continue? (yes/no): ")
    if response.lower() == 'yes':
        remove_duplicate_slots()
    else:
        print("Cancelled.")
