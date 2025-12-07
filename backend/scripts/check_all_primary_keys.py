"""
Check all tables for missing PRIMARY KEY constraints
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from db.db import SessionLocal, engine

def check_all_tables():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("CHECKING ALL TABLES FOR PRIMARY KEYS")
        print("=" * 60)
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        tables_without_pk = []
        tables_with_pk = []
        
        for table in sorted(tables):
            pk = inspector.get_pk_constraint(table)
            if pk and pk['constrained_columns']:
                tables_with_pk.append((table, ', '.join(pk['constrained_columns'])))
            else:
                tables_without_pk.append(table)
        
        print(f"\n✅ Tables WITH primary keys ({len(tables_with_pk)}):")
        for table, pk_cols in tables_with_pk:
            print(f"   - {table}: {pk_cols}")
        
        if tables_without_pk:
            print(f"\n❌ Tables WITHOUT primary keys ({len(tables_without_pk)}):")
            for table in tables_without_pk:
                print(f"   - {table}")
            print("\n⚠️  WARNING: These tables should have primary keys!")
        else:
            print(f"\n✅ All {len(tables)} tables have primary keys!")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_all_tables()
