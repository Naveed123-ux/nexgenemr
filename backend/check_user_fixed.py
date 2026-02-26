import os
import base64
import sys
from cryptography.fernet import Fernet
from sqlalchemy import text, create_engine
from sqlalchemy.orm import Session

# Add current dir to path
sys.path.insert(0, '.')

# Load .env manually to avoid dependency issues
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
        return fernet.decrypt(value.encode()).decode()
    except:
        return value

def encrypt(value):
    return fernet.encrypt(value.encode()).decode()

engine = create_engine(db_url)

target_emails = ['naveed23xyz@gmail.com', 'za441568@gmail.com']

with engine.connect() as conn:
    # Get all roles for mapping
    roles_res = conn.execute(text("SELECT id, name FROM roles"))
    role_map = {row[0]: decrypt(row[1]) for row in roles_res}
    print(f"Roles in DB: {role_map}")

    # Get all users
    users_res = conn.execute(text("SELECT id, email, role_id FROM users"))
    
    for row in users_res:
        user_id, enc_email, role_id = row
        dec_email = decrypt(enc_email)
        
        if dec_email in target_emails:
            role_name = role_map.get(role_id, "Unknown")
            print(f"MATCH: {dec_email} | Role: {role_name} (ID: {role_id}) | ID: {user_id}")
            
            # Check for doctor profile
            doc_res = conn.execute(text(f"SELECT id FROM doctor_profiles WHERE user_id = {user_id}")).fetchone()
            print(f"  Doctor Profile: {'Found' if doc_res else 'NOT FOUND'}")
