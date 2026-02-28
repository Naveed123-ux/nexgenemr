from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import encrypt_field, decrypt_field

engine = create_engine(DATABASE_URL)

def revert_changes():
    print("READ CAREFULLY: Reverting database changes...")
    print("⚠️ WARNING: Reverting role encryption WILL likely cause 'InvalidToken' errors on login because the Role model expects encrypted names.")
    
    with engine.connect() as conn:
        # 1. Delete 'bruce.wayne@hospital.com'
        # We need to find the user.
        print("🔍 Searching for 'bruce.wayne@hospital.com' to delete...")
        users = conn.execute(text("SELECT id, email FROM users")).fetchall()
        target_uid = None
        for u in users:
            try:
                if decrypt_field(u[1]) == "bruce.wayne@hospital.com":
                    target_uid = u[0]
                    break
            except:
                pass
        
        if target_uid:
            conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": target_uid})
            print(f"✅ Deleted user 'bruce.wayne@hospital.com' (ID: {target_uid})")
        else:
            print("ℹ️ User 'bruce.wayne@hospital.com' not found.")

        # 2. Revert Role Names to Plain Text
        # We look for roles that look like "Super_Admin" or "Hospital_Admin" (encrypted)
        print("🔍 Reverting role names to plain text...")
        roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        
        for r in roles:
            rid, enc_name = r
            try:
                dec_name = decrypt_field(enc_name)
                if dec_name == "Super_Admin":
                    print(f"🔄 Reverting Role {rid} to 'Super_Admin' (Plain Text)")
                    conn.execute(text("UPDATE roles SET name = 'Super_Admin' WHERE id = :rid"), {"rid": rid})
                elif dec_name == "Hospital_Admin":
                    print(f"🔄 Reverting Role {rid} to 'Hospital_Admin' (Plain Text)")
                    conn.execute(text("UPDATE roles SET name = 'Hospital_Admin' WHERE id = :rid"), {"rid": rid})
            except:
                # If decryption fails, it might already be plain text
                if enc_name == "Super_Admin" or enc_name == "Hospital_Admin":
                    print(f"ℹ️ Role {rid} is already plain text '{enc_name}'")

        # 3. Unlink Permissions (messaging:read, messaging:create) from Super_Admin
        # First find Super_Admin role ID (now plain text or still encrypted? we just updated it if found)
        # Let's search by plain text name now
        sa_role = conn.execute(text("SELECT id FROM roles WHERE name = 'Super_Admin'")).fetchone()
        if sa_role:
            sa_id = sa_role[0]
            print(f"🔍 Removing messaging permissions from Role {sa_id}...")
            
            perms = ["messaging:read", "messaging:create"]
            for p_name in perms:
                # Find permission ID
                try:
                    # Permissions might be encrypted too? Check model. Permission model has encrypted names.
                    # My raw fix created them as plain text?
                    # raw_fix_perms.py: INSERT INTO permissions (name...) VALUES (:name...) -> raw check showed :name="messaging:read"
                    # Wait, Permission keys: name needed to be encrypted?
                    # Permission model: name = Column(String) -> set value calls encrypt_field.
                    # My raw SQL inserted PLAIN TEXT.
                    # So I should look for plain text 'messaging:read'.
                    
                    p_res = conn.execute(text("SELECT id FROM permissions WHERE name = :name"), {"name": p_name}).fetchone()
                    if p_res:
                        pid = p_res[0]
                        conn.execute(text("DELETE FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"), {"rid": sa_id, "pid": pid})
                        print(f"✅ Unlinked '{p_name}' from Super_Admin")
                    else:
                        print(f"ℹ️ Permission '{p_name}' not found (plain text).")
                except Exception as e:
                    print(f"⚠️ Error removing permission {p_name}: {e}")

        conn.commit()
        print("🎉 Revert script finished.")

if __name__ == "__main__":
    revert_changes()
