from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.role_model import Role
from models.permission_model import Permission
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def fix_super_admin_permissions():
    print("🔧 Checking Super_Admin permissions...")
    role = db.query(Role).filter(Role.name == "Super_Admin").first()
    
    if not role:
        print("❌ Role 'Super_Admin' not found!")
        return

    # List of permissions to ensure
    required_perms = ["messaging:read", "messaging:create"]
    
    # 1. Ensure permissions exist in Permission table
    for perm_slug in required_perms:
        perm = db.query(Permission).filter(Permission.slug == perm_slug).first()
        if not perm:
            print(f"Creating missing permission: {perm_slug}")
            perm = Permission(slug=perm_slug, description=f"Permission for {perm_slug}")
            db.add(perm)
            db.commit()
            db.refresh(perm)
        
        # 2. Check if role has this permission
        if perm not in role.permissions:
            print(f"➕ Adding '{perm_slug}' to Super_Admin")
            role.permissions.append(perm)
        else:
            print(f"✅ Super_Admin already has '{perm_slug}'")
            
    db.commit()
    print("🎉 Permissions updated successfully!")

if __name__ == "__main__":
    fix_super_admin_permissions()
