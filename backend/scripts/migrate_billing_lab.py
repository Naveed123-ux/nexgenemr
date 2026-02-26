import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.getcwd())
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    if not DATABASE_URL:
        print("🔴 ERROR: DATABASE_URL not found.")
        return

    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("⏳ Applying migrations to 'public' schema...")
        
        try:
            # 1. Add price to lab_requests
            print("Adding 'price' to 'lab_requests' table...")
            conn.execute(text("ALTER TABLE public.lab_requests ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION"))
            print("✅ Column 'price' added successfully.")
            
            # 2. Add lab_request_id to bill_items
            print("Adding 'lab_request_id' to 'bill_items' table...")
            conn.execute(text("ALTER TABLE public.bill_items ADD COLUMN IF NOT EXISTS lab_request_id INTEGER REFERENCES public.lab_requests(id)"))
            print("✅ Column 'lab_request_id' added successfully.")
            
            # 3. Make appointment_id nullable in bill_items (it might already be nullable, but let's ensure it)
            print("Ensuring 'appointment_id' is nullable in 'bill_items'...")
            conn.execute(text("ALTER TABLE public.bill_items ALTER COLUMN appointment_id DROP NOT NULL"))
            print("✅ Column 'appointment_id' is now nullable.")
            
            conn.commit()
            print("🏆 Migration completed successfully!")
            
        except Exception as e:
            print(f"🔴 Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    run_migration()
