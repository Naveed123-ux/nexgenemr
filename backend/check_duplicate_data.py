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
    print(f"--- Checking Associated Data for User ID: {uid} ---")
    
    # Check SOAP notes
    soap = conn.execute(text("SELECT count(*) FROM soap_notes WHERE doctor_id = :uid"), {"uid": uid}).scalar()
    print(f"SOAP Notes: {soap}")
    
    # Check Lab Requests
    lab = conn.execute(text("SELECT count(*) FROM lab_requests WHERE doctor_id = :uid"), {"uid": uid}).scalar()
    print(f"Lab Requests: {lab}")
    
    # Check ICD Codes assigned to appointments for this doctor
    icd = conn.execute(text("""
        SELECT count(*) 
        FROM appointment_icd_codes aic
        JOIN appointments a ON aic.appointment_id = a.id
        WHERE a.doctor_user_id = :uid
    """), {"uid": uid}).scalar()
    print(f"ICD Codes: {icd}")

    # Check Audit Logs
    audit = conn.execute(text("SELECT count(*) FROM audit_logs WHERE user_id = :uid"), {"uid": uid}).scalar()
    print(f"Audit Logs: {audit}")
