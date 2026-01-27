import sys
import os

# Set up backend path for imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import datetime
from utils.encryption import encrypt_field

load_dotenv()
database_url = os.getenv("DATABASE_URL")

def verify_all_roles_encryption():
    engine = create_engine(database_url)
    with engine.connect() as connection:
        # --- 1. Fix Encryption for existing roles ---
        result = connection.execute(text("SELECT id, name, created_at, updated_at FROM roles")).fetchall()
        for row in result:
            needs_update = False
            updates = {}
            for field in ["name", "created_at", "updated_at"]:
                val = getattr(row, field)
                if val:
                    try:
                        from utils.encryption import decrypt_field
                        decrypt_field(val)
                    except Exception:
                        print(f"🔧 Found plain-text {field} for role ID {row.id}. Encrypting...")
                        updates[field] = encrypt_field(val)
                        needs_update = True
            
            if needs_update:
                set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                params = {"id": row.id}
                params.update(updates)
                connection.execute(text(f"UPDATE roles SET {set_clause} WHERE id = :id"), params)
                connection.commit()
                print(f"✅ Role ID {row.id} updated successfully.")

        # --- 2. Seed Permissions ---
        permissions_to_add = [
            "lab:request", "lab:read:all", "lab:read:own", "lab:accept", "lab:process", "lab:review"
        ]
        now_str = str(datetime.utcnow())
        
        for p_name in permissions_to_add:
            # Check if exists (encrypted)
            all_p = connection.execute(text("SELECT id, name FROM permissions")).fetchall()
            exists = False
            for p_row in all_p:
                try:
                    from utils.encryption import decrypt_field
                    if decrypt_field(p_row.name) == p_name:
                        exists = True
                        break
                except:
                    if p_row.name == p_name: # Handle existing plain text if any
                        exists = True
                        break
            
            if not exists:
                print(f"⏳ Creating permission: {p_name}")
                connection.execute(
                    text("INSERT INTO permissions (name, isactive, created_at, updated_at) VALUES (:name, :isactive, :created_at, :updated_at)"),
                    {"name": encrypt_field(p_name), "isactive": True, "created_at": encrypt_field(now_str), "updated_at": encrypt_field(now_str)}
                )
                connection.commit()

        # --- 3. Link Permissions to Roles ---
        # Get IDs (decrypted)
        def get_role_id(name):
            rs = connection.execute(text("SELECT id, name FROM roles")).fetchall()
            for r in rs:
                from utils.encryption import decrypt_field
                try:
                    if decrypt_field(r.name) == name: return r.id
                except:
                    if r.name == name: return r.id
            return None

        def get_perm_id(name):
            ps = connection.execute(text("SELECT id, name FROM permissions")).fetchall()
            for p in ps:
                from utils.encryption import decrypt_field
                try:
                    if decrypt_field(p.name) == name: return p.id
                except:
                    if p.name == name: return p.id
            return None

        role_mappings = {
            "Doctor": ["lab:request", "lab:read:own", "lab:review"],
            "Lab_Technician": ["lab:read:all", "lab:accept", "lab:process"]
        }

        for role_name, perms in role_mappings.items():
            r_id = get_role_id(role_name)
            if not r_id: continue
            
            for p_name in perms:
                p_id = get_perm_id(p_name)
                if not p_id: continue
                
                # Check if association exists
                assoc = connection.execute(
                    text("SELECT * FROM role_permissions WHERE role_id = :r_id AND permission_id = :p_id"),
                    {"r_id": r_id, "p_id": p_id}
                ).fetchone()
                
                if not assoc:
                    print(f"🔗 Linking {p_name} to {role_name}")
                    connection.execute(
                        text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r_id, :p_id)"),
                        {"r_id": r_id, "p_id": p_id}
                    )
                    connection.commit()

if __name__ == "__main__":
    verify_all_roles_encryption()
