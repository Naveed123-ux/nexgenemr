import os
import sys
from sqlalchemy import create_engine, text
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Add current directory to path for imports if needed
sys.path.append(os.getcwd())

load_dotenv()

EMR_ENCRYPTION_KEY = os.getenv("EMR_ENCRYPTION_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not EMR_ENCRYPTION_KEY or not DATABASE_URL:
    print("Error: EMR_ENCRYPTION_KEY or DATABASE_URL not found in .env")
    sys.exit(1)

f = Fernet(EMR_ENCRYPTION_KEY.encode())

def decrypt(value):
    try:
        if not value:
            return None
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value

def check_email(target_email):
    engine = create_engine(DATABASE_URL)
    target_email = target_email.lower().strip()
    
    found_in_users = False
    found_in_requests = False
    
    with engine.connect() as conn:
        # Check Users Table
        print(f"Checking 'users' table for: {target_email}...")
        result = conn.execute(text("SELECT id, email, first_name, last_name FROM users"))
        for row in result:
            id, enc_email, first_name, last_name = row
            dec_email = decrypt(enc_email)
            if dec_email and dec_email.lower().strip() == target_email:
                print(f"MATCH FOUND in 'users' table!")
                print(f"- User ID: {id}")
                print(f"- Name: {decrypt(first_name)} {decrypt(last_name)}")
                found_in_users = True
        
        # Check Hospital Requests Table
        print(f"\nChecking 'hospital_requests' table for: {target_email}...")
        try:
            result = conn.execute(text("SELECT id, email, name FROM hospital_requests"))
            for row in result:
                id, enc_email, name = row
                dec_email = decrypt(enc_email)
                if dec_email and dec_email.lower().strip() == target_email:
                    print(f"MATCH FOUND in 'hospital_requests' table!")
                    print(f"- Request ID: {id}")
                    print(f"- Hospital Name: {decrypt(name)}")
                    found_in_requests = True
        except Exception as e:
            print(f"Note: Could not check hospital_requests (table might not exist or schema differs): {e}")

    if not found_in_users and not found_in_requests:
        print(f"\nNo records found for email: {target_email}")

if __name__ == "__main__":
    email_to_check = "naveed.zafar@volmatica.com"
    check_email(email_to_check)
