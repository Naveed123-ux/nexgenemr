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
        print(f"\n--- Appointments for User ID: {uid} ---")
        query = text("""
            SELECT a.id, a.status, s.start_time 
            FROM appointments a 
            JOIN appointment_slots s ON a.appointment_slot_id = s.id 
            WHERE a.doctor_user_id = :uid
        """)
        appts = conn.execute(query, {"uid": uid}).fetchall()
        print(f"Count: {len(appts)}")
        for appt in appts:
            print(f"Appt ID: {appt[0]}, Status: {appt[1]}, Start: {appt[2]}")
