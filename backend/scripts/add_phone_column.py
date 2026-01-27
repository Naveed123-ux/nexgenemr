import sys
import os
from sqlalchemy import text

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from db.db import engine

def add_phone_column():
    with engine.connect() as connection:
        try:
            print("Adding 'phone_number' column to 'staff_profiles' table...")
            connection.execute(text('ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR;'))
            connection.commit()
            print("Successfully added 'phone_number' column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_phone_column()
