"""
Add PRIMARY KEY constraint to appointment_slots table
This should have been there from the start but was missing!
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.db import SessionLocal

def add_primary_key():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("ADDING PRIMARY KEY CONSTRAINT")
        print("=" * 60)
        
        # First, verify no duplicates exist
        print("\n1️⃣ Checking for duplicate IDs...")
        result = db.execute(text("""
            SELECT COUNT(*) FROM (
                SELECT id, COUNT(*) as count
                FROM appointment_slots
                GROUP BY id
                HAVING COUNT(*) > 1
            ) as dupes
        """))
        
        duplicate_count = result.scalar()
        
        if duplicate_count > 0:
            print(f"   ❌ ERROR: Found {duplicate_count} duplicate IDs!")
            print("   ⚠️  Run fix_duplicate_slots_simple.py first!")
            return False
        
        print("   ✅ No duplicates found")
        
        # Check if primary key already exists
        print("\n2️⃣ Checking current constraints...")
        result = db.execute(text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'appointment_slots' 
            AND constraint_type = 'PRIMARY KEY'
        """))
        
        existing_pk = result.scalar()
        
        if existing_pk:
            print(f"   ℹ️  Primary key already exists: {existing_pk}")
            return True
        
        print("   ⚠️  No primary key found")
        
        # Add the primary key constraint
        print("\n3️⃣ Adding PRIMARY KEY constraint...")
        db.execute(text("""
            ALTER TABLE appointment_slots 
            ADD CONSTRAINT appointment_slots_pkey 
            PRIMARY KEY (id)
        """))
        
        db.commit()
        print("   ✅ PRIMARY KEY constraint added successfully!")
        
        # Verify it was added
        print("\n4️⃣ Verifying constraint...")
        result = db.execute(text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'appointment_slots' 
            AND constraint_type = 'PRIMARY KEY'
        """))
        
        pk_name = result.scalar()
        if pk_name:
            print(f"   ✅ Verified: {pk_name}")
        else:
            print("   ❌ Verification failed!")
            return False
        
        print("\n" + "=" * 60)
        print("✅ SUCCESS! Primary key constraint is now in place.")
        print("=" * 60)
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("\n⚠️  This will add a PRIMARY KEY constraint to appointment_slots.id")
    print("⚠️  Make sure no duplicate IDs exist before running this!\n")
    
    response = input("Continue? (yes/no): ")
    if response.lower() == 'yes':
        success = add_primary_key()
        if success:
            print("\n✅ Done! The table now has proper constraints.")
            print("💡 Restart your application to ensure everything works correctly.")
        else:
            print("\n❌ Failed to add constraint. Check the errors above.")
    else:
        print("Cancelled.")
