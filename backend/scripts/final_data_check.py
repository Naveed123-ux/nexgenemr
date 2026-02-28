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
    with open("id_101_final_check.txt", "w") as f:
        f.write(f"--- Final Check for ID: {uid} ---\n")
        
        # Check Lab Requests
        try:
            count = conn.execute(text("SELECT count(*) FROM lab_requests WHERE doctor_id = :uid"), {"uid": uid}).scalar()
            f.write(f"lab_requests (doctor_id): {count}\n")
        except Exception as e:
            f.write(f"lab_requests error: {e}\n")

        # Check Google Auth Tokens
        try:
            count = conn.execute(text("SELECT count(*) FROM google_auth_tokens WHERE doctor_user_id = :uid"), {"uid": uid}).scalar()
            f.write(f"google_auth_tokens (doctor_user_id): {count}\n")
        except Exception as e:
            f.write(f"google_auth_tokens error: {e}\n")

        # Check Doctor Profile
        try:
            count = conn.execute(text("SELECT count(*) FROM doctor_profiles WHERE user_id = :uid"), {"uid": uid}).scalar()
            f.write(f"doctor_profiles (user_id): {count}\n")
        except Exception as e:
            f.write(f"doctor_profiles error: {e}\n")
            
        # Check Appointments
        try:
            count = conn.execute(text("SELECT count(*) FROM appointments WHERE doctor_user_id = :uid"), {"uid": uid}).scalar()
            f.write(f"appointments: {count}\n")
        except Exception as e:
            f.write(f"appointments error: {e}\n")
