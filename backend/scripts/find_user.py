import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from db.db import SessionLocal
from models.user_model import User

def find_user(email):
    db = SessionLocal()
    try:
        print(f"Searching for user: {email}")
        all_users = db.query(User).all()
        target_user = None
        for user in all_users:
            if user.email == email:
                target_user = user
                break
        
        if not target_user:
            print("User not found.")
            return

        print(f"ID: {target_user.id}")
        print(f"Name: {target_user.first_name} {target_user.last_name}")
        print(f"Role: {target_user.role.name if target_user.role else 'None'}")
        
        # Quick check for profiles
        if target_user.patient_profile:
            print("Has Patient Profile")
        if target_user.doctor_profile:
            print("Has Doctor Profile")
        if target_user.staff_profile:
            print("Has Staff Profile")

    finally:
        db.close()

if __name__ == "__main__":
    find_user("aleshaimran21@gmail.com")
