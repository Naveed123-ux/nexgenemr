from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.role_model import Role, Permission, role_permissions
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def check_permissions():
    role_name = "Super_Admin"
    role = db.query(Role).filter(Role.name == role_name).first()
    
    if not role:
        print(f"Role {role_name} not found!")
        return

    print(f"Permissions for {role_name}:")
    for perm in role.permissions:
        print(f" - {perm.slug}")

    required = ["messaging:read", "messaging:create"]
    for req in required:
        has_perm = any(p.slug == req for p in role.permissions)
        print(f"Has '{req}': {has_perm}")

if __name__ == "__main__":
    check_permissions()
