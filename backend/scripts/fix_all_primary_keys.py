"""
Add PRIMARY KEY constraints to all tables that are missing them
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.db import SessionLocal

# Tables that should have primary keys and their PK column(s)
TABLES_TO_FIX = {
    'appointments': 'id',
    'appointment_sessions': 'id',
    'appointment_icd_codes': 'id',
    'hospitals': 'id',
    'doctor_profiles': 'id',
    'departments': 'id',
    'icd_codes': 'id',
    'bills': 'id',
    'conversations': 'id',
    'conversation_participants': 'id',
    'discharge_summaries': 'id',
    'google_auth_tokens': 'id',
    'handoff_notes': 'id',
    'hospital_requests': 'id',
}

def check_for_duplicates(db, table, pk_column):
    """Check if table has duplicate primary key values"""
    result = db.execute(text(f"""
        SELECT COUNT(*) FROM (
            SELECT {pk_column}, COUNT(*) as count
            FROM {table}
            GROUP BY {pk_column}
            HAVING COUNT(*) > 1
        ) as dupes
    """))
    return result.scalar()

def add_primary_key(db, table, pk_column):
    """Add primary key constraint to a table"""
    constraint_name = f"{table}_pkey"
    
    try:
        db.execute(text(f"""
            ALTER TABLE {table} 
            ADD CONSTRAINT {constraint_name} 
            PRIMARY KEY ({pk_column})
        """))
        return True
    except Exception as e:
        print(f"      ❌ Error: {e}")
        return False

def fix_all_primary_keys():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("FIXING PRIMARY KEY CONSTRAINTS")
        print("=" * 60)
        
        fixed = []
        skipped = []
        failed = []
        
        for table, pk_column in TABLES_TO_FIX.items():
            print(f"\n📋 Processing: {table}")
            
            # Check if table exists
            result = db.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                )
            """))
            
            if not result.scalar():
                print(f"   ⚠️  Table doesn't exist, skipping")
                skipped.append(table)
                continue
            
            # Check if PK already exists
            result = db.execute(text(f"""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = '{table}' 
                AND constraint_type = 'PRIMARY KEY'
            """))
            
            existing_pk = result.scalar()
            if existing_pk:
                print(f"   ✅ Already has PK: {existing_pk}")
                skipped.append(table)
                continue
            
            # Check for duplicates
            print(f"   🔍 Checking for duplicate {pk_column} values...")
            dup_count = check_for_duplicates(db, table, pk_column)
            
            if dup_count > 0:
                print(f"   ❌ Found {dup_count} duplicate values!")
                print(f"   ⚠️  Cannot add PK constraint with duplicates")
                failed.append((table, f"{dup_count} duplicates"))
                continue
            
            print(f"   ✅ No duplicates")
            
            # Add primary key
            print(f"   🔧 Adding PRIMARY KEY constraint...")
            if add_primary_key(db, table, pk_column):
                print(f"   ✅ SUCCESS!")
                fixed.append(table)
            else:
                failed.append((table, "constraint failed"))
        
        db.commit()
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        
        if fixed:
            print(f"\n✅ Fixed ({len(fixed)}):")
            for table in fixed:
                print(f"   - {table}")
        
        if skipped:
            print(f"\n⏭️  Skipped ({len(skipped)}):")
            for table in skipped:
                print(f"   - {table}")
        
        if failed:
            print(f"\n❌ Failed ({len(failed)}):")
            for table, reason in failed:
                print(f"   - {table}: {reason}")
        
        print("\n" + "=" * 60)
        
        if failed:
            print("\n⚠️  Some tables still need attention!")
            print("💡 For tables with duplicates, you need to:")
            print("   1. Identify and remove duplicate rows")
            print("   2. Then run this script again")
        else:
            print("\n✅ All tables now have proper PRIMARY KEY constraints!")
        
        return len(failed) == 0
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("\n⚠️  This will add PRIMARY KEY constraints to multiple tables")
    print("⚠️  Make sure you have a database backup!\n")
    
    response = input("Continue? (yes/no): ")
    if response.lower() == 'yes':
        success = fix_all_primary_keys()
        if success:
            print("\n✅ Done! All tables now have proper constraints.")
            print("💡 Restart your application.")
        else:
            print("\n⚠️  Some issues remain. Check the output above.")
    else:
        print("Cancelled.")
