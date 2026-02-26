from sqlalchemy import text, create_engine
from cryptography.fernet import Fernet
import os

# Load .env
env_vars = {}
with open('.env', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, val = line.strip().split('=', 1)
            env_vars[key] = val.strip('"')

encryption_key = env_vars.get("EMR_ENCRYPTION_KEY")
db_url = env_vars.get("DATABASE_URL")

fernet = Fernet(encryption_key.encode())
def decrypt(val):
    try:
        return fernet.decrypt(val.encode()).decode()
    except:
        return val

engine = create_engine(db_url)

with open('search_results.txt', 'w', encoding='utf-8') as f_out:
    def log(msg):
        print(msg)
        f_out.write(str(msg) + '\n')

    with engine.connect() as conn:
        log("--- SEARCHING FOR ALL ENTRIES MATCHING naveed23xyz@gmail.com ---")
        
        roles_res = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        role_map = {row[0]: decrypt(row[1]) for row in roles_res}

        users = conn.execute(text("SELECT id, email, role_id FROM users")).fetchall()
        
        matches_found = 0
        for row in users:
            uid, enc_email, rid = row
            if decrypt(enc_email) == 'naveed23xyz@gmail.com':
                matches_found += 1
                role_name = role_map.get(rid, f"Unknown (ID: {rid})")
                log(f"USER ID: {uid} | Role: {role_name}")
                
                # Check Doctor Profile
                doc = conn.execute(text(f"SELECT id, department_id FROM doctor_profiles WHERE user_id = {uid}")).fetchone()
                if doc:
                    dept_id = doc[1]
                    h_res = conn.execute(text(f"SELECT h.id, h.name FROM departments d JOIN hospitals h ON d.hospital_id = h.id WHERE d.id = {dept_id}")).fetchone()
                    h_info = f"Hospital: {decrypt(h_res[1])} (ID: {h_res[0]})" if h_res else "No Hospital"
                    log(f"  - Doctor Profile found (ID: {doc[0]}) | {h_info}")
                else:
                    log("  - No Doctor Profile")
                    
                # Check Staff Profile
                staff = conn.execute(text(f"SELECT id, hospital_id FROM staff_profiles WHERE user_id = {uid}")).fetchone()
                if staff:
                    h_res = conn.execute(text(f"SELECT id, name FROM hospitals WHERE id = {staff[1]}")).fetchone()
                    h_info = f"Hospital: {decrypt(h_res[1])} (ID: {h_res[0]})" if h_res else "No Hospital"
                    log(f"  - Staff Profile found (ID: {staff[0]}) | {h_info}")
                
                log("-" * 50)
                
        if matches_found == 0:
            log("No matches found.")
