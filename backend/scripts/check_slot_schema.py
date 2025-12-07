"""
Check the actual database schema for appointment_slots table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from db.db import SessionLocal, engine

def check_schema():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("APPOINTMENT_SLOTS TABLE SCHEMA")
        print("=" * 60)
        
        # Get table info using inspector
        inspector = inspect(engine)
        
        # Check if table exists
        if 'appointment_slots' not in inspector.get_table_names():
            print("❌ Table 'appointment_slots' does not exist!")
            return
        
        print("\n📋 COLUMNS:")
        columns = inspector.get_columns('appointment_slots')
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f" DEFAULT {col['default']}" if col['default'] else ""
            print(f"  - {col['name']}: {col['type']} {nullable}{default}")
        
        print("\n🔑 PRIMARY KEY:")
        pk = inspector.get_pk_constraint('appointment_slots')
        if pk and pk['constrained_columns']:
            print(f"  - {', '.join(pk['constrained_columns'])}")
        else:
            print("  ⚠️  NO PRIMARY KEY DEFINED!")
        
        print("\n🔒 UNIQUE CONSTRAINTS:")
        unique_constraints = inspector.get_unique_constraints('appointment_slots')
        if unique_constraints:
            for uc in unique_constraints:
                print(f"  - {uc['name']}: {', '.join(uc['column_names'])}")
        else:
            print("  - None")
        
        print("\n🔗 FOREIGN KEYS:")
        fks = inspector.get_foreign_keys('appointment_slots')
        if fks:
            for fk in fks:
                print(f"  - {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        else:
            print("  - None")
        
        print("\n📊 INDEXES:")
        indexes = inspector.get_indexes('appointment_slots')
        if indexes:
            for idx in indexes:
                unique = "UNIQUE" if idx['unique'] else ""
                print(f"  - {idx['name']}: {', '.join(idx['column_names'])} {unique}")
        else:
            print("  - None")
        
        # Check for actual duplicate IDs
        print("\n🔍 CHECKING FOR DUPLICATE IDs:")
        result = db.execute(text("""
            SELECT id, COUNT(*) as count
            FROM appointment_slots
            GROUP BY id
            HAVING COUNT(*) > 1
            LIMIT 5
        """))
        
        duplicates = result.fetchall()
        if duplicates:
            print(f"  ❌ Found {len(duplicates)} duplicate IDs:")
            for dup in duplicates:
                print(f"     ID {dup[0]} appears {dup[1]} times")
        else:
            print("  ✅ No duplicate IDs found")
        
        # Check total rows vs unique IDs
        print("\n📈 ROW COUNT:")
        total_rows = db.execute(text("SELECT COUNT(*) FROM appointment_slots")).scalar()
        unique_ids = db.execute(text("SELECT COUNT(DISTINCT id) FROM appointment_slots")).scalar()
        print(f"  - Total rows: {total_rows}")
        print(f"  - Unique IDs: {unique_ids}")
        if total_rows != unique_ids:
            print(f"  ⚠️  MISMATCH: {total_rows - unique_ids} duplicate rows!")
        else:
            print("  ✅ All IDs are unique")
        
        # Check if ID is auto-incrementing
        print("\n🔢 ID SEQUENCE:")
        result = db.execute(text("""
            SELECT column_default 
            FROM information_schema.columns 
            WHERE table_name = 'appointment_slots' 
            AND column_name = 'id'
        """))
        default = result.scalar()
        print(f"  - Default: {default}")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_schema()
