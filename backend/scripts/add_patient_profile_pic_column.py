import sys
import os

# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in environment variables")
    sys.exit(1)

def add_column():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    columns = [col['name'] for col in inspector.get_columns('patient_profiles')]
    
    if 'profile_picture_url' in columns:
        print("Column 'profile_picture_url' already exists in 'patient_profiles'.")
    else:
        print("Adding 'profile_picture_url' column to 'patient_profiles'...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE patient_profiles ADD COLUMN profile_picture_url VARCHAR(255)"))
            conn.commit()
        print("Column added successfully.")

if __name__ == "__main__":
    add_column()
