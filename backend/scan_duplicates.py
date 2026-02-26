import os
import sys
from sqlalchemy import create_engine, text
from collections import defaultdict
from dotenv import load_dotenv

# Add backend to path to import encryption
sys.path.append(os.path.abspath('c:/nexgenemr/backend'))
from utils.encryption import decrypt_field

load_dotenv('c:/nexgenemr/backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    users = conn.execute(text("SELECT id, email, role_id FROM users")).fetchall()
    email_map = defaultdict(list)
    
    for user in users:
        try:
            email = decrypt_field(user[1])
            email_map[(email, user[2])].append(user[0])
        except:
            pass
            
    with open("duplicates_report.txt", "w") as f:
        f.write("--- Duplicates Report (Email, Role ID) ---\n")
        for (email, role), ids in email_map.items():
            if len(ids) > 1:
                f.write(f"Email: {email}, Role: {role}, IDs: {ids}\n")
                # For each ID, check if it has appointments or profile
                for uid in ids:
                    profile = conn.execute(text("SELECT count(*) FROM doctor_profiles WHERE user_id = :uid"), {"uid": uid}).scalar()
                    appts = conn.execute(text("SELECT count(*) FROM appointments WHERE doctor_user_id = :uid"), {"uid": uid}).scalar()
                    f.write(f"  ID {uid}: Profile={profile}, Appts={appts}\n")
