from sqlalchemy.orm import Session
from db.db import SessionLocal
from models.role_model import Role
from models.permission_model import Permission
from datetime import datetime

def add_permission():
    db = SessionLocal()
    try:
        # 1. Create the permission if it doesn't exist
        perm_name = "hospitals:update"
        perm = None
        all_perms = db.query(Permission).all()
        for p in all_perms:
            if p.name == perm_name:
                perm = p
                break
        
        if not perm:
            print(f"Creating permission: {perm_name}")
            perm = Permission(
                name=perm_name,
                isactive=True,
                created_at=str(datetime.utcnow()),
                updated_at=str(datetime.utcnow())
            )
            db.add(perm)
            db.flush()
        else:
            print(f"Permission {perm_name} already exists.")

        # 2. Assign to Super_Admin
        super_admin_role = None
        roles = db.query(Role).all()
        for role in roles:
            if role.name == "Super_Admin":
                super_admin_role = role
                break
        
        if super_admin_role:
            if perm not in super_admin_role.permissions:
                print(f"Adding {perm_name} to Super_Admin role.")
                super_admin_role.permissions.append(perm)
                db.commit()
                print("✅ Successfully updated Super_Admin permissions.")
            else:
                print("Super_Admin already has this permission.")
        else:
            print("❌ Super_Admin role not found.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_permission()
