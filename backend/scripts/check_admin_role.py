from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user_model import User
from models.role_model import Role
from models.permission_model import Permission
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def check_admin_user():
    print("🕵️ Checking admin user...")
    # Try to find a user that looks like an admin
    admin_emails = ["admin@gmail.com", "superadmin@gmail.com", "admin@nexgen.com"]
    
    for email in admin_emails:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"✅ Found user: {user.email}")
            print(f"   Role ID: {user.role_id}")
            if user.role:
                print(f"   Role Name: '{user.role.name}'")
                print(f"   Permissions: {[p.slug for p in user.role.permissions]}")
            else:
                print("   ❌ User has no role relation!")
            return

    print("❌ No standard admin user found. Listing all users with 'Admin' in role:")
    users = db.query(User).join(Role).filter(Role.name.like("%Admin%")).all()
    for u in users:
        print(f" - {u.email} ({u.role.name})")

if __name__ == "__main__":
    check_admin_user()
