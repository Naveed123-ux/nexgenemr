import os
from sqlalchemy import create_engine, text
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

EMR_ENCRYPTION_KEY = os.getenv("EMR_ENCRYPTION_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

f = Fernet(EMR_ENCRYPTION_KEY.encode())

def decrypt(value):
    try:
        return f.decrypt(value.encode()).decode()
    except:
        return value

def find_user(email_to_find):
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, first_name, last_name, role_id FROM users"))
        for row in result:
            id, enc_email, first_name, last_name, role_id = row
            email = decrypt(enc_email)
            if email == email_to_find:
                print(f"FOUND USER:")
                print(f"ID: {id}")
                print(f"Email: {email}")
                print(f"Name: {decrypt(first_name)} {decrypt(last_name)}")
                print(f"Role ID: {role_id}")
                
                # Check for role name
                role_res = conn.execute(text(f"SELECT name FROM roles WHERE id = {role_id}"))
                role_row = role_res.fetchone()
                if role_row:
                    print(f"Role Name: {decrypt(role_row[0])}")
                return id
        print("User not found.")
        return None

if __name__ == "__main__":
    find_user("aleshaimran21@gmail.com")
