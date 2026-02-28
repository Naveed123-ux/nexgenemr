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

with engine.connect() as conn:
    # Get hospital for doctor naveed23xyz@gmail.com
    # First find the user ID for simplicity
    users = conn.execute(text("SELECT id, email FROM users")).fetchall()
    user_id = None
    for row in users:
        if decrypt(row[1]) == 'naveed23xyz@gmail.com':
            user_id = row[0]
            break
    
    if user_id:
        print(f"USER_ID: {user_id}")
        res = conn.execute(text(f"SELECT h.id, h.name FROM doctor_profiles p JOIN departments d ON p.department_id = d.id JOIN hospitals h ON d.hospital_id = h.id WHERE p.user_id = {user_id}")).fetchone()
        if res:
            print(f"HOSPITAL_ID: {res[0]}")
            print(f"HOSPITAL_NAME: {decrypt(res[1])}")
        else:
            print("No hospital linked to this doctor profile.")
    else:
        print("User not found.")
