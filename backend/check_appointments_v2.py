import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend to path to import encryption
sys.path.append(os.path.abspath('c:/nexgenemr/backend'))
from utils.encryption import encrypt_field

load_dotenv('c:/nexgenemr/backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

doctor_email = "naveed23xyz@gmail.com"
encrypted_email = encrypt_field(doctor_email)

with engine.connect() as conn:
    print(f"--- DB Check ---")
    user = conn.execute(text("SELECT id, email FROM users WHERE email = :email"), {"email": encrypted_email}).fetchone()
    if user:
        user_id = user[0]
        print(f"Found Doctor User ID: {user_id}")
        
        # Check appointments specifically for this ID
        query = text("""
            SELECT a.id, a.status, s.start_time 
            FROM appointments a 
            JOIN appointment_slots s ON a.appointment_slot_id = s.id 
            WHERE a.doctor_user_id = :uid
        """)
        appts = conn.execute(query, {"uid": user_id}).fetchall()
        print(f"Count of appointments for User {user_id}: {len(appts)}")
        for appt in appts:
            print(f"Appt ID: {appt[0]}, Status: {appt[1]}, Start: {appt[2]}")
    else:
        print("Doctor user not found.")
