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
    for uid in [100, 101]:
        print(f"\n--- Doctor Profile for User ID: {uid} ---")
        query = text("SELECT * FROM doctor_profiles WHERE user_id = :uid")
        profile = conn.execute(query, {"uid": uid}).fetchone()
        if profile:
            print(f"Profile found for User {uid}")
        else:
            print(f"No doctor profile for User {uid}")
