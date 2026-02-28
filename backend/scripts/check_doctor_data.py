from sqlalchemy import text, create_engine
import sys

db_url = 'postgresql://postgres:postgres@localhost:5432/nexgen'
engine = create_engine(db_url)

u_ids = [100, 101]

with engine.connect() as conn:
    print("--- ASSOCIATED DATA CHECK ---")
    for uid in u_ids:
        print(f"USER ID: {uid}")
        
        # Doctor Profile
        doc = conn.execute(text(f"SELECT id FROM doctor_profiles WHERE user_id = {uid}")).fetchone()
        if doc:
            pid = doc[0]
            print(f"  - Doctor Profile ID: {pid}")
            
            # Appointments
            appts = conn.execute(text(f"SELECT count(*) FROM appointments WHERE doctor_id = {pid}")).scalar()
            print(f"  - Appointments: {appts}")
            
            # Appointment Sessions
            sessions = conn.execute(text(f"SELECT count(*) FROM appointment_sessions WHERE doctor_id = {pid}")).scalar()
            print(f"  - Sessions: {sessions}")

            # Recurrence Patterns
            patterns = conn.execute(text(f"SELECT count(*) FROM session_recurrence_patterns WHERE doctor_id = {pid}")).scalar()
            print(f"  - Recurrence Patterns: {patterns}")
            
        print("-" * 30)
