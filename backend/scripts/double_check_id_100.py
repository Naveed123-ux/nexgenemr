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
    uid = 100
    print(f"--- Checking ID: {uid} ---")
    
    count = conn.execute(text("SELECT count(*) FROM doctor_profiles WHERE user_id = :uid"), {"uid": uid}).scalar()
    print(f"doctor_profiles: {count}")
    
    count = conn.execute(text("SELECT count(*) FROM appointments WHERE doctor_user_id = :uid"), {"uid": uid}).scalar()
    print(f"appointments: {count}")
