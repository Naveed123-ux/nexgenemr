import os
import base64
import sys
from cryptography.fernet import Fernet
from sqlalchemy import text, create_engine

# Add current dir to path
sys.path.insert(0, '.')

# Load .env manually
with open('.env', 'r') as f:
    env_vars = {}
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, val = line.strip().split('=', 1)
            env_vars[key] = val.strip('"')

encryption_key = env_vars.get("EMR_ENCRYPTION_KEY")
db_url = env_vars.get("DATABASE_URL")

if not encryption_key or not db_url:
    print("Missing encryption key or DB URL in .env")
    sys.exit(1)

fernet = Fernet(encryption_key.encode())

def decrypt(value):
    try:
        if not value: return value
        return fernet.decrypt(value.encode()).decode()
    except Exception as e:
        return f"[ERROR: {str(e)}]"

engine = create_engine(db_url)

target_emails = ['naveed23xyz@gmail.com', 'za441568@gmail.com']

with open('check_output.txt', 'w', encoding='utf-8') as log:
    def log_print(msg):
        print(msg)
        log.write(str(msg) + '\n')

    with engine.connect() as conn:
        log_print("--- ROLES IN DATABASE ---")
        roles_res = conn.execute(text("SELECT id, name FROM roles ORDER BY id"))
        role_map = {}
        for row in roles_res:
            rid, enc_name = row
            dec_name = decrypt(enc_name)
            role_map[rid] = dec_name
            log_print(f"Role ID {rid}: {dec_name}")
        log_print("-" * 30)

        log_print("--- USER CHECKS ---")
        users_res = conn.execute(text("SELECT id, email, role_id FROM users"))
        
        for row in users_res:
            uid, enc_email, rid = row
            dec_email = decrypt(enc_email)
            
            if dec_email in target_emails:
                role_name = role_map.get(rid, f"UNKNOWN (ID: {rid})")
                log_print(f"USER: {dec_email} | Role: {role_name} (ID: {rid}) | ID: {uid}")
                
                # Check doctor profile
                doc = conn.execute(text(f"SELECT id FROM doctor_profiles WHERE user_id = {uid}")).fetchone()
                log_print(f"  Doctor Profile: {'Found' if doc else 'MISSING'}")
                
                # Check staff profile
                staff = conn.execute(text(f"SELECT id FROM staff_profiles WHERE user_id = {uid}")).fetchone()
                log_print(f"  Staff Profile: {'Found' if staff else 'MISSING'}")
                
        log_print("-" * 30)
