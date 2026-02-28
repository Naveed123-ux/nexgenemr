import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('c:/nexgenemr/backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    uid = 101
    print(f"--- Deleting Duplicate User ID: {uid} ---")
    
    # 1. Delete Doctor Profile
    conn.execute(text("DELETE FROM doctor_profiles WHERE user_id = :uid"), {"uid": uid})
    
    # 2. Delete User (FKs should handle health_profiles etc if any, but we checked and there are none)
    conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
    
    conn.commit()
    print("Done.")
