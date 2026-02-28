"""Quick script to check user roles - using main.py imports"""
# Import from main to get all models registered
from main import app
from db.db import SessionLocal
from models.user_model import User
from models.role_model import Role

db = SessionLocal()

emails_to_check = ['naveed23xyz@gmail.com', 'za441568@gmail.com']

print("=" * 60)
for email in emails_to_check:
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"Email: {user.email}")
        print(f"  User ID: {user.id}")
        print(f"  Name: {user.first_name} {user.last_name}")
        print(f"  Role ID: {user.role_id}")
        print(f"  Role Name: {user.role.name if user.role else 'NO ROLE'}")
        print(f"  Is Active: {user.is_active}")
        print(f"  Has Doctor Profile: {user.doctor_profile is not None}")
        print(f"  Has Staff Profile: {user.staff_profile is not None}")
        print(f"  Has Hospital (Admin): {user.hospital is not None}")
        if user.doctor_profile:
            print(f"  Doctor Profile ID: {user.doctor_profile.id}")
            print(f"  Department ID: {user.doctor_profile.department_id}")
    else:
        print(f"Email: {email} - NOT FOUND")
    print("-" * 60)

print("\nAll Roles in Database:")
roles = db.query(Role).all()
for role in roles:
    print(f"  ID: {role.id}, Name: {role.name}")

db.close()
