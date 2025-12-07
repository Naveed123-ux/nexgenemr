"""
Script to identify and fix duplicate appointment slots in the database.
This should be run if you encounter the error:
"UPDATE statement on table 'appointment_slots' expected to update 1 row(s); 2 were matched."
"""

import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from models.appointment_slot_model import AppointmentSlot
from models.appointment_session_model import AppointmentSession
from models.appointment_model import Appointment
from db.db import get_db, engine
from datetime import datetime

def find_duplicate_slots():
    """Find slots that have duplicate IDs"""
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Find duplicate slot IDs
        duplicates = db.query(
            AppointmentSlot.id,
            func.count(AppointmentSlot.id).label('count')
        ).group_by(AppointmentSlot.id).having(func.count(AppointmentSlot.id) > 1).all()
        
        if not duplicates:
            print("✅ No duplicate slots found!")
            return []
        
        print(f"⚠️ Found {len(duplicates)} slot IDs with duplicates:")
        for slot_id, count in duplicates:
            print(f"  - Slot ID {slot_id}: {count} duplicates")
            
            # Get all instances of this slot
            slots = db.query(AppointmentSlot).filter(
                AppointmentSlot.id == slot_id
            ).all()
            
            for i, slot in enumerate(slots):
                print(f"    [{i+1}] Session: {slot.session_id}, Start: {slot.start_time}, Booked: {slot.is_booked}")
        
        return duplicates
    
    finally:
        db.close()


def fix_duplicate_slots(dry_run=True):
    """
    Fix duplicate slots by keeping only one instance of each.
    
    Strategy:
    1. For each duplicate slot ID, keep the one that is booked (if any)
    2. If none are booked, keep the first one
    3. Delete the rest
    
    Args:
        dry_run: If True, only show what would be done without making changes
    """
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Find duplicate slot IDs
        duplicates = db.query(
            AppointmentSlot.id,
            func.count(AppointmentSlot.id).label('count')
        ).group_by(AppointmentSlot.id).having(func.count(AppointmentSlot.id) > 1).all()
        
        if not duplicates:
            print("✅ No duplicate slots found!")
            return
        
        print(f"\n{'🔍 DRY RUN MODE' if dry_run else '⚠️ FIXING DUPLICATES'}")
        print(f"Found {len(duplicates)} slot IDs with duplicates\n")
        
        total_deleted = 0
        
        for slot_id, count in duplicates:
            # Get all instances of this slot
            slots = db.query(AppointmentSlot).filter(
                AppointmentSlot.id == slot_id
            ).all()
            
            print(f"Processing Slot ID {slot_id} ({count} duplicates):")
            
            # Check if any are booked
            booked_slots = [s for s in slots if s.is_booked]
            
            if booked_slots:
                # Keep the booked one
                keep_slot = booked_slots[0]
                print(f"  ✓ Keeping booked slot (Session: {keep_slot.session_id})")
            else:
                # Keep the first one
                keep_slot = slots[0]
                print(f"  ✓ Keeping first slot (Session: {keep_slot.session_id})")
            
            # Delete the rest
            for slot in slots:
                if slot != keep_slot:
                    print(f"  ✗ {'Would delete' if dry_run else 'Deleting'} duplicate (Session: {slot.session_id})")
                    if not dry_run:
                        db.delete(slot)
                        total_deleted += 1
        
        if not dry_run:
            db.commit()
            print(f"\n✅ Successfully deleted {total_deleted} duplicate slots")
        else:
            print(f"\n🔍 Would delete {len(duplicates)} duplicate slots")
            print("Run with dry_run=False to actually fix the duplicates")
    
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    
    finally:
        db.close()


def check_slot_integrity():
    """Check for other potential slot issues"""
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        print("\n🔍 Checking slot integrity...\n")
        
        # Check for slots without sessions
        orphaned_slots = db.query(AppointmentSlot).filter(
            ~AppointmentSlot.session_id.in_(
                db.query(AppointmentSlot.session_id).distinct()
            )
        ).count()
        
        if orphaned_slots > 0:
            print(f"⚠️ Found {orphaned_slots} slots without valid sessions")
        else:
            print("✅ All slots have valid sessions")
        
        # Check for booked slots without appointments
        booked_slots = db.query(AppointmentSlot).filter(
            AppointmentSlot.is_booked == True
        ).all()
        
        slots_without_appointments = 0
        for slot in booked_slots:
            appointment = db.query(Appointment).filter(
                Appointment.appointment_slot_id == slot.id
            ).first()
            if not appointment:
                slots_without_appointments += 1
        
        if slots_without_appointments > 0:
            print(f"⚠️ Found {slots_without_appointments} booked slots without appointments")
        else:
            print("✅ All booked slots have appointments")
        
        # Check for appointments with invalid slots
        appointments = db.query(Appointment).all()
        invalid_appointments = 0
        for appt in appointments:
            slot = db.query(AppointmentSlot).filter(
                AppointmentSlot.id == appt.appointment_slot_id
            ).first()
            if not slot:
                invalid_appointments += 1
        
        if invalid_appointments > 0:
            print(f"⚠️ Found {invalid_appointments} appointments with invalid slots")
        else:
            print("✅ All appointments have valid slots")
    
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Appointment Slot Duplicate Checker & Fixer")
    print("=" * 60)
    
    # Step 1: Find duplicates
    duplicates = find_duplicate_slots()
    
    if duplicates:
        print("\n" + "=" * 60)
        
        # Step 2: Show what would be fixed (dry run)
        fix_duplicate_slots(dry_run=True)
        
        # Step 3: Ask for confirmation
        print("\n" + "=" * 60)
        response = input("\nDo you want to fix these duplicates? (yes/no): ")
        
        if response.lower() in ['yes', 'y']:
            fix_duplicate_slots(dry_run=False)
        else:
            print("❌ Cancelled. No changes made.")
    
    # Step 4: Check overall integrity
    check_slot_integrity()
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)
