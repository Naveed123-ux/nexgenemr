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

query_user = text("SELECT id, email, first_name, last_name, role_id FROM users WHERE email = :email")
query_appointments = text("""
    SELECT a.id, a.patient_profile_id, a.doctor_user_id, a.status, a.is_telehealth, s.start_time, s.end_time
    FROM appointments a
    JOIN appointment_slots s ON a.appointment_slot_id = s.id
    WHERE a.doctor_user_id = (SELECT id FROM users WHERE email = :email)
""")

with engine.connect() as conn:
    print(f"--- Checking User: {doctor_email} ---")
    user = conn.execute(query_user, {"email": encrypted_email}).fetchone()
    if user:
        user_id = user[0]
        print(f"Found User ID: {user_id}, Name: {user[2]} {user[3]}, Role ID: {user[4]}")
        
        print("\n--- Appointments for this Doctor ---")
        appts = conn.execute(query_appointments, {"email": encrypted_email}).fetchall()
        if appts:
            for appt in appts:
                print(f"ID: {appt[0]}, Patient ID: {appt[1]}, Status: {appt[3]}, Tele: {appt[4]}, Start: {appt[5]}, End: {appt[6]}")
        else:
            print("No appointments found for this doctor in the database.")
    else:
        print(f"User with email {doctor_email} not found.")

    # Also check if there are appointments at all in the system to verify query logic
    print("\n--- Total Appointments in System ---")
    total = conn.execute(text("SELECT count(*) FROM appointments")).scalar()
    print(f"Total: {total}")
