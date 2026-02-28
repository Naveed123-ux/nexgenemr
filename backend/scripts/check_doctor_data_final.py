from sqlalchemy import text, create_engine
import sys

db_url = 'postgresql://postgres:postgres@localhost:5432/nexgen'
engine = create_engine(db_url)

u_ids = [100, 101]

with open('check_results.txt', 'w', encoding='utf-8') as f_out:
    def log(msg):
        print(msg)
        f_out.write(str(msg) + '\n')

    with engine.connect() as conn:
        log("--- ASSOCIATED DATA CHECK (FINAL ATTEMPT) ---")
        for uid in u_ids:
            log(f"USER ID: {uid}")
            
            # Doctor Profile
            doc = conn.execute(text(f"SELECT id FROM doctor_profiles WHERE user_id = {uid}")).fetchone()
            if doc:
                pid = doc[0]
                log(f"  - Doctor Profile ID: {pid}")
                
                # Use raw SQL counts per table
                tabs = [
                    'appointments', 
                    'appointment_sessions', 
                    'session_recurrence_patterns',
                    'appointment_requests',
                    'vitals',
                    'soap_notes',
                    'prescriptions',
                    'lab_requests'
                ]
                
                for table in tabs:
                    try:
                        # Check if column 'doctor_id' exists in this table
                        cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")).fetchall()
                        col_names = [c[0] for c in cols]
                        
                        if 'doctor_id' in col_names:
                            count = conn.execute(text(f"SELECT count(*) FROM {table} WHERE doctor_id = {pid}")).scalar()
                            log(f"  - {table}: {count}")
                        elif 'doctor_user_id' in col_names:
                            count = conn.execute(text(f"SELECT count(*) FROM {table} WHERE doctor_user_id = {uid}")).scalar()
                            log(f"  - {table} (by user_id): {count}")
                    except Exception as e:
                        log(f"  - Error checking {table}: {e}")
                
            log("-" * 30)
