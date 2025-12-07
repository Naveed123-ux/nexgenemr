"""
Comprehensive script to remove duplicate records from all tables
Strategy: Keep the first occurrence, remove others (unless there's a better strategy per table)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.db import SessionLocal

# Define cleanup strategies for each table
CLEANUP_STRATEGIES = {
    'icd_codes': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'ICD diagnostic codes'
    },
    'appointment_sessions': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Doctor appointment sessions'
    },
    'appointments': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Patient appointments'
    },
    'hospitals': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Hospital records'
    },
    'doctor_profiles': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Doctor profiles'
    },
    'departments': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Hospital departments'
    },
    'appointment_icd_codes': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Appointment-ICD code mappings'
    },
    'bills': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Billing records'
    },
    'conversations': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Message conversations'
    },
    'conversation_participants': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Conversation participants'
    },
    'discharge_summaries': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Patient discharge summaries'
    },
    'google_auth_tokens': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Google OAuth tokens'
    },
    'handoff_notes': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Patient handoff notes'
    },
    'hospital_requests': {
        'pk': 'id',
        'strategy': 'keep_first',
        'description': 'Hospital registration requests'
    },
}

def count_duplicates(db, table, pk_column):
    """Count duplicate primary key values in a table"""
    result = db.execute(text(f"""
        SELECT COUNT(*) FROM (
            SELECT {pk_column}, COUNT(*) as count
            FROM {table}
            GROUP BY {pk_column}
            HAVING COUNT(*) > 1
        ) as dupes
    """))
    return result.scalar()

def get_duplicate_ids(db, table, pk_column):
    """Get list of duplicate IDs"""
    result = db.execute(text(f"""
        SELECT {pk_column}, COUNT(*) as count
        FROM {table}
        GROUP BY {pk_column}
        HAVING COUNT(*) > 1
        ORDER BY count DESC, {pk_column}
    """))
    return result.fetchall()

def remove_duplicates_keep_first(db, table, pk_column):
    """Remove duplicates, keeping the first occurrence (lowest ctid/rowid)"""
    try:
        # PostgreSQL uses ctid
        result = db.execute(text(f"""
            DELETE FROM {table}
            WHERE ctid NOT IN (
                SELECT MIN(ctid)
                FROM {table}
                GROUP BY {pk_column}
            )
        """))
        return result.rowcount
    except Exception as e:
        # Fallback for other databases (SQLite uses rowid)
        try:
            result = db.execute(text(f"""
                DELETE FROM {table}
                WHERE rowid NOT IN (
                    SELECT MIN(rowid)
                    FROM {table}
                    GROUP BY {pk_column}
                )
            """))
            return result.rowcount
        except:
            raise e

def cleanup_table(db, table, config):
    """Clean up duplicates in a single table"""
    pk_column = config['pk']
    description = config['description']
    
    print(f"\n{'='*60}")
    print(f"📋 {table.upper()}")
    print(f"   {description}")
    print(f"{'='*60}")
    
    # Check if table exists
    result = db.execute(text(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table}'
        )
    """))
    
    if not result.scalar():
        print(f"   ⚠️  Table doesn't exist, skipping")
        return {'status': 'skipped', 'reason': 'table not found'}
    
    # Count total rows
    total_rows = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
    print(f"   📊 Total rows: {total_rows:,}")
    
    # Count duplicates
    dup_count = count_duplicates(db, table, pk_column)
    
    if dup_count == 0:
        print(f"   ✅ No duplicates found")
        return {'status': 'clean', 'removed': 0}
    
    print(f"   ❌ Found {dup_count:,} duplicate {pk_column} values")
    
    # Get sample of duplicates
    duplicates = get_duplicate_ids(db, table, pk_column)
    print(f"   📝 Top duplicates:")
    for dup_id, count in duplicates[:5]:
        print(f"      - {pk_column}={dup_id} appears {count} times")
    if len(duplicates) > 5:
        print(f"      ... and {len(duplicates) - 5} more")
    
    # Remove duplicates
    print(f"   🔧 Removing duplicates (keeping first occurrence)...")
    removed = remove_duplicates_keep_first(db, table, pk_column)
    print(f"   ✅ Removed {removed:,} duplicate rows")
    
    # Verify
    remaining_dups = count_duplicates(db, table, pk_column)
    if remaining_dups > 0:
        print(f"   ⚠️  WARNING: Still {remaining_dups} duplicates remaining!")
        return {'status': 'partial', 'removed': removed, 'remaining': remaining_dups}
    
    new_total = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
    print(f"   📊 New total: {new_total:,} rows ({total_rows - new_total:,} removed)")
    
    return {'status': 'success', 'removed': removed}

def cleanup_all_duplicates():
    """Clean up duplicates in all tables"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("COMPREHENSIVE DUPLICATE CLEANUP")
        print("=" * 60)
        print(f"\n🎯 Processing {len(CLEANUP_STRATEGIES)} tables...")
        
        results = {}
        total_removed = 0
        
        for table, config in CLEANUP_STRATEGIES.items():
            result = cleanup_table(db, table, config)
            results[table] = result
            if result['status'] in ['success', 'partial']:
                total_removed += result['removed']
        
        # Commit all changes
        print(f"\n{'='*60}")
        print("💾 COMMITTING CHANGES...")
        print(f"{'='*60}")
        db.commit()
        print("   ✅ All changes committed successfully!")
        
        # Summary
        print(f"\n{'='*60}")
        print("📊 SUMMARY")
        print(f"{'='*60}")
        
        success = [t for t, r in results.items() if r['status'] == 'success']
        clean = [t for t, r in results.items() if r['status'] == 'clean']
        partial = [t for t, r in results.items() if r['status'] == 'partial']
        skipped = [t for t, r in results.items() if r['status'] == 'skipped']
        
        if success:
            print(f"\n✅ Successfully cleaned ({len(success)}):")
            for table in success:
                removed = results[table]['removed']
                print(f"   - {table}: {removed:,} duplicates removed")
        
        if clean:
            print(f"\n✨ Already clean ({len(clean)}):")
            for table in clean:
                print(f"   - {table}")
        
        if partial:
            print(f"\n⚠️  Partially cleaned ({len(partial)}):")
            for table in partial:
                removed = results[table]['removed']
                remaining = results[table]['remaining']
                print(f"   - {table}: {removed:,} removed, {remaining:,} still remain")
        
        if skipped:
            print(f"\n⏭️  Skipped ({len(skipped)}):")
            for table in skipped:
                print(f"   - {table}")
        
        print(f"\n{'='*60}")
        print(f"🎉 TOTAL: {total_removed:,} duplicate rows removed!")
        print(f"{'='*60}")
        
        if partial:
            print("\n⚠️  Some tables still have duplicates.")
            print("💡 You may need to investigate these manually.")
        else:
            print("\n✅ All duplicates successfully removed!")
            print("💡 Next step: Run fix_all_primary_keys.py to add constraints")
        
        return len(partial) == 0
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\n⚠️  Changes have been rolled back!")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("⚠️  COMPREHENSIVE DUPLICATE CLEANUP")
    print("=" * 60)
    print("\nThis will remove duplicate records from 14 tables:")
    for table, config in CLEANUP_STRATEGIES.items():
        print(f"  - {table}")
    print("\nStrategy: Keep first occurrence, delete others")
    print("\n⚠️  Make sure you have a database backup!")
    print("=" * 60)
    
    response = input("\nContinue? (yes/no): ")
    if response.lower() == 'yes':
        print("\nStarting cleanup...\n")
        success = cleanup_all_duplicates()
        
        if success:
            print("\n✅ Cleanup complete! Database is ready for constraints.")
        else:
            print("\n⚠️  Cleanup completed with issues. Review the output above.")
    else:
        print("\nCancelled.")
