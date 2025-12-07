"""
Simple script to remove duplicate appointment slots using raw SQL
This avoids SQLAlchemy ORM issues with duplicate primary keys
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.db import SessionLocal

def fix_duplicate_slots():
    db = SessionLocal()
    try:
        print("🔍 Finding duplicate appointment slots...\n")
        
        # Find duplicate slot IDs
        result = db.execute(text("""
            SELECT id, COUNT(*) as count
            FROM appointment_slots
            GROUP BY id
            HAVING COUNT(*) > 1
        """))
        
        duplicates = result.fetchall()
        
        if not duplicates:
            print("✅ No duplicate slot IDs found!")
            return
        
        print(f"❌ Found {len(duplicates)} duplicate slot IDs\n")
        
        total_removed = 0
        
        for row in duplicates:
            slot_id = row[0]
            count = row[1]
            print(f"Processing Slot ID {slot_id} ({count} duplicates)...")
            
            # Check if any have appointments
            appt_check = db.execute(text("""
                SELECT COUNT(*) FROM appointments WHERE appointment_slot_id = :slot_id
            """), {"slot_id": slot_id}).scalar()
            
            if appt_check > 0:
                print(f"  ⚠️  Slot has {appt_check} appointment(s) - keeping first, removing others")
            
            # Delete all but the first occurrence using ctid (PostgreSQL) or rowid (SQLite)
            # For PostgreSQL:
            try:
                result = db.execute(text("""
                    DELETE FROM appointment_slots
                    WHERE ctid NOT IN (
                        SELECT MIN(ctid)
                        FROM appointment_slots
                        WHERE id = :slot_id
                    ) AND id = :slot_id
                """), {"slot_id": slot_id})
                removed = result.rowcount
            except:
                # Fallback for SQLite or other databases
                result = db.execute(text("""
                    DELETE FROM appointment_slots
                    WHERE rowid NOT IN (
                        SELECT MIN(rowid)
                        FROM appointment_slots
                        WHERE id = :slot_id
                    ) AND id = :slot_id
                """), {"slot_id": slot_id})
                removed = result.rowcount
            
            total_removed += removed
            print(f"  ✓ Removed {removed} duplicate(s)\n")
        
        db.commit()
        print(f"\n✅ Successfully removed {total_removed} duplicate slots!")
        print("⚠️  Restart your application to clear SQLAlchemy cache.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("DUPLICATE SLOT REMOVAL SCRIPT")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Find all duplicate slot IDs in appointment_slots table")
    print("2. Keep the first occurrence of each duplicate")
    print("3. Delete all other duplicates")
    print("\n⚠️  WARNING: This will permanently delete data!")
    print("=" * 60)
    
    response = input("\nContinue? (yes/no): ")
    if response.lower() == 'yes':
        fix_duplicate_slots()
    else:
        print("Cancelled.")
