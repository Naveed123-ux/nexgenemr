from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import encrypt_field

engine = create_engine(DATABASE_URL)

def fix_duplicates():
    print("🔧 Fixing Duplicate Roles & Encryption...")
    with engine.connect() as conn:
        # We have:
        # Role ID: 1 | Raw Name: Super_Admin
        # Role ID: 5 | Raw Name: Hospital_Admin
        # Role ID: 12 | Raw Name: Super_Admin
        # Role ID: 13 | Raw Name: Hospital_Admin
        
        # Strategy: Keep LOWEST ID as valid (1 and 5).
        # Move users from 12 -> 1, 13 -> 5.
        # Delete 12, 13.
        # Encrypt 1, 5.
        
        valid_sa_id = 1
        dup_sa_id = 12
        
        valid_ha_id = 5
        dup_ha_id = 13
        
        # 1. Migrate Users (Super_Admin)
        print(f"🔄 Migrating users from Role {dup_sa_id} to {valid_sa_id}...")
        conn.execute(text("UPDATE users SET role_id = :valid WHERE role_id = :dup"), {"valid": valid_sa_id, "dup": dup_sa_id})
        
        # 2. Migrate Users (Hospital_Admin)
        print(f"🔄 Migrating users from Role {dup_ha_id} to {valid_ha_id}...")
        conn.execute(text("UPDATE users SET role_id = :valid WHERE role_id = :dup"), {"valid": valid_ha_id, "dup": dup_ha_id})
        
        # 2.5 Delete role_permissions for duplicates
        print("🗑️ Cleaning up role_permissions for duplicates...")
        conn.execute(text("DELETE FROM role_permissions WHERE role_id IN (:r1, :r2)"), {"r1": dup_sa_id, "r2": dup_ha_id})

        # 3. Delete Duplicates
        print(f"🗑️ Deleting duplicate Role {dup_sa_id}...")
        conn.execute(text("DELETE FROM roles WHERE id = :rid"), {"rid": dup_sa_id})
        
        print(f"🗑️ Deleting duplicate Role {dup_ha_id}...")
        conn.execute(text("DELETE FROM roles WHERE id = :rid"), {"rid": dup_ha_id})
        
        # 4. Encrypt Valid Roles
        target_roles = {
            valid_sa_id: "Super_Admin",
            valid_ha_id: "Hospital_Admin"
        }
        
        for rid, name in target_roles.items():
            print(f"🔐 Encrypting Role {rid} ('{name}')...")
            enc_name = encrypt_field(name)
            conn.execute(text("UPDATE roles SET name = :enc WHERE id = :rid"), {"enc": enc_name, "rid": rid})
            
        conn.commit()
        print("🎉 Fix Complete! Duplicates removed and names encrypted.")

if __name__ == "__main__":
    fix_duplicates()
