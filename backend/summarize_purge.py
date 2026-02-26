import os
from sqlalchemy import create_engine, text
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
EMR_ENCRYPTION_KEY = os.getenv("EMR_ENCRYPTION_KEY")
USER_ID = 88
EMAIL_TO_DELETE = "aleshaimran21@gmail.com"

f = Fernet(EMR_ENCRYPTION_KEY.encode())

def decrypt(value):
    try:
        return f.decrypt(value.encode()).decode()
    except:
        return value

def summarize_data():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        print(f"Summary for User ID {USER_ID} ({EMAIL_TO_DELETE})")
        
        patient_profile_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM patient_profiles WHERE user_id = {USER_ID}")).fetchall()]
        
        appt_where = f"doctor_user_id = {USER_ID}"
        if patient_profile_ids:
            appt_where += f" OR patient_profile_id IN ({','.join(map(str, patient_profile_ids))})"
        appt_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM appointments WHERE {appt_where}")).fetchall()]
        
        lab_req_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM lab_requests WHERE patient_id = {USER_ID} OR doctor_id = {USER_ID} OR lab_tech_id = {USER_ID}")).fetchall()]
        
        tables = [
            ("LabResult", "lab_results", f"WHERE patient_user_id = {USER_ID}"),
            ("DischargeSummary", "discharge_summaries", f"WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1}) OR patient_user_id = {USER_ID} OR created_by_doctor_id = {USER_ID}"),
            ("Appointment", "appointments", f"WHERE id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("AppointmentSlot", "appointment_slots", f"WHERE doctor_user_id = {USER_ID}"),
            ("AppointmentSession", "appointment_sessions", f"WHERE doctor_id = {USER_ID}"),
            ("PatientTask", "patient_tasks", f"WHERE patient_user_id = {USER_ID} OR created_by_user_id = {USER_ID}"),
            ("DoctorProfile", "doctor_profiles", f"WHERE user_id = {USER_ID}"),
            ("LabRequest", "lab_requests", f"WHERE id IN ({','.join(map(str, lab_req_ids)) if lab_req_ids else -1})"),
            ("User", "users", f"WHERE id = {USER_ID}")
        ]

        for label, table, where in tables:
            try:
                count_sql = f"SELECT COUNT(*) FROM {table} {where}"
                count = conn.execute(text(count_sql)).scalar()
                if count > 0:
                    print(f"- {label}: {count}")
            except Exception as e:
                # print(f"Error checking {label}: {e}")
                pass

if __name__ == "__main__":
    summarize_data()
