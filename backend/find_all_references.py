import os
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TARGET_ID = 88

def find_references(target_id):
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    found_any = False
    with engine.connect() as conn:
        for table in tables:
            columns = inspector.get_columns(table)
            for column in columns:
                col_name = column['name']
                col_type = str(column['type']).lower()
                
                # Only check integer columns or columns that might contain IDs
                if 'int' in col_type:
                    try:
                        query = text(f"SELECT COUNT(*) FROM {table} WHERE {col_name} = :target_id")
                        count = conn.execute(query, {"target_id": target_id}).scalar()
                        if count > 0:
                            print(f"FOUND: Table '{table}', Column '{col_name}': {count} records")
                            found_any = True
                    except Exception as e:
                        # Some columns might not be directly comparable or tables might have issues
                        pass
    
    if not found_any:
        print(f"No references to ID {target_id} found in any table.")

if __name__ == "__main__":
    print(f"Scanning database for references to ID {TARGET_ID}...")
    find_references(TARGET_ID)
