"""
Script to find and report duplicate appointment slots in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, text
from db.db import SessionLocal

def find_duplicate_slots():
    db = SessionLocal()
    try:
        print("🔍 Searching for duplicate appointment slots...\n")
        
        # Find IDs that appear more than once using raw SQL
        result = db.execute(text("""
            SELECT id, COUNT(*) as count
            FROM appointment_slots
            GROUP BY id
            HAVING COUNT(*) > 1
            ORDER BY count DESC, id
        """))
        
        duplicates = result.fetchall()
        
        if not duplicates:
            print("✅ No duplicate slot IDs found!")
            return
        
        print(f"❌ Found {len(duplicates)} duplicate slot IDs:\n")
        
        total_dupes = 0
        for row in duplicates:
            slot_id = row[0]
            count = row[1]
            total_dupes += (count - 1)
            
            print(f"Slot ID {slot_id} appears {count} times:")
            
            # Get details for each duplicate
            details = db.execute(text("""
                SELECT session_id, start_time, end_time, is_booked, is_blocked
                FROM appointment_slots
                WHERE id = :slot_id
            """), {"slot_id": slot_id}).fetchall()
            
            for idx, detail in enumerate(details, 1):
                print(f"  [{idx}] Session: {detail[0]}, Time: {detail[1]}, Booked: {detail[3]}, Blocked: {detail[4]}")
            
            # Check if any have appointments
            appt_count = db.execute(text("""
                SELECT COUNT(*) FROM appointments WHERE appointment_slot_id = :slot_id
            """), {"slot_id": slot_id}).scalar()
            
            if appt_count > 0:
                print(f"  ⚠️  Has {appt_count} appointment(s) booked")
            print()
        
        print(f"\n📊 Total duplicate records to remove: {total_dupes}")
        print(f"💡 Run 'python scripts/fix_duplicate_slots_simple.py' to fix")
        
    finally:
        db.close()

if __name__ == "__main__":
    find_duplicate_slots()
