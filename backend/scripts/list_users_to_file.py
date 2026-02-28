import os
import sys
from sqlalchemy import create_engine, text
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
    users = conn.execute(text("SELECT id, email, first_name, last_name, role_id FROM users")).fetchall()
    with open("user_list.txt", "w") as f:
        f.write("--- User List (Decrypted) ---\n")
        for user in users:
            try:
                email = decrypt_field(user[1])
                f.write(f"ID: {user[0]}, Email: {email}, Name: {user[2]} {user[3]}, Role ID: {user[4]}\n")
            except:
                f.write(f"ID: {user[0]}, Email: [CANT DECRYPT], Name: {user[2]} {user[3]}, Role ID: {user[4]}\n")
