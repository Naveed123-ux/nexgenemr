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
    with open("id_101_check.txt", "w") as f:
        f.write(f"--- Checking ID: {uid} ---\n")
        
        tables = [
            "appointments", "soap_notes", "lab_requests", "audit_logs", 
            "doctor_profiles", "google_auth_tokens"
        ]
        
        for table in tables:
            try:
                count = 0
                if table == "appointments":
                    count = conn.execute(text("SELECT count(*) FROM appointments WHERE doctor_user_id = :uid"), {"uid": uid}).scalar()
                elif table == "soap_notes":
                    count = conn.execute(text("SELECT count(*) FROM soap_notes WHERE doctor_id = :uid"), {"uid": uid}).scalar()
                elif table == "doctor_profiles":
                    count = conn.execute(text("SELECT count(*) FROM doctor_profiles WHERE user_id = :uid"), {"uid": uid}).scalar()
                elif table in ["audit_logs", "google_auth_tokens"]:
                    col = "user_id" if table == "audit_logs" else "doctor_user_id"
                    count = conn.execute(text(f"SELECT count(*) FROM {table} WHERE {col} = :uid"), {"uid": uid}).scalar()
                else:
                    count = conn.execute(text(f"SELECT count(*) FROM {table} WHERE doctor_id = :uid"), {"uid": uid}).scalar()
                
                f.write(f"{table}: {count}\n")
            except Exception as e:
                f.write(f"{table}: Error - {e}\n")

        # Check ICD codes through appointments
        try:
            count = conn.execute(text("""
                SELECT count(*) 
                FROM appointment_icd_codes aic
                JOIN appointments a ON aic.appointment_id = a.id
                WHERE a.doctor_user_id = :uid
            """), {"uid": uid}).scalar()
            f.write(f"appointment_icd_codes: {count}\n")
        except Exception as e:
            f.write(f"appointment_icd_codes: Error - {e}\n")
