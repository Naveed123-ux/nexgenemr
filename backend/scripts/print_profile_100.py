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
    print(f"--- Doctor Profile for User ID: {uid} ---")
    query = text("SELECT * FROM doctor_profiles WHERE user_id = :uid")
    profile = conn.execute(query, {"uid": uid}).fetchone()
    if profile:
        # Convert row to dict for easier reading
        p_dict = dict(profile._mapping)
        for k, v in p_dict.items():
            print(f"{k}: {v}")
    else:
        print(f"No doctor profile for User {uid}")
