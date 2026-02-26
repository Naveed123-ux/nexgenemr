from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import encrypt_field

engine = create_engine(DATABASE_URL)

def run_fix():
    print("🔧 Running Comprehensive Fix...")
    with engine.connect() as conn:
        # 1. Get Role IDs
        roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        role_map = {r[1]: r[0] for r in roles}
        
        # Helper to get or create role
        def get_or_create_role(name):
            r = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": name}).fetchone()
            if r:
                return r[0]
            print(f"⚠️ Role '{name}' missing. Creating...")
            r = conn.execute(text("INSERT INTO roles (name, isactive) VALUES (:name, :act) RETURNING id"), {"name": name, "act": True}).fetchone()
            print(f"✅ Created Role '{name}' (ID: {r[0]})")
            return r[0]

        super_admin_id = get_or_create_role("Super_Admin")
        hospital_admin_id = get_or_create_role("Hospital_Admin")

        print(f"✅ IDs - Super_Admin: {super_admin_id}, Hospital_Admin: {hospital_admin_id}")

        # 2. Fix 'admin@gmail.com' role
        # We search by email. Since encryption is non-deterministic (usually), we might not find it by simple select if IV is random.
        # But if `encrypt_field` uses a static IV (unlikely for good security but possible in dev), we can try.
        # Alternatively, fetch all and decrypt python-side to find the ID.
        
        print("🔍 Searching for 'admin@gmail.com'...")
        users = conn.execute(text("SELECT id, email FROM users")).fetchall()
        admin_user_id = None
        
        from utils.encryption import decrypt_field
        
        for u in users:
            try:
                dec_email = decrypt_field(u[1])
                if dec_email == "admin@gmail.com":
                    admin_user_id = u[0]
                    break
            except:
                continue
        
        if admin_user_id:
            print(f"✅ Found 'admin@gmail.com' (ID: {admin_user_id})")
            conn.execute(text("UPDATE users SET role_id = :rid WHERE id = :uid"), {"rid": super_admin_id, "uid": admin_user_id})
            print(f"✅ Assigned Super_Admin role to ID {admin_user_id}")
        else:
            print("⚠️ 'admin@gmail.com' not found. Creating it...")
            # Create super admin user
            enc_email = encrypt_field("admin@gmail.com")
            enc_pass = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" # "password" hashed
            enc_fname = encrypt_field("Super")
            enc_lname = encrypt_field("Admin")
            
            conn.execute(text("""
                INSERT INTO users (email, hashed_password, first_name, last_name, role_id, is_active)
                VALUES (:e, :p, :f, :l, :r, :a)
            """), {"e": enc_email, "p": enc_pass, "f": enc_fname, "l": enc_lname, "r": super_admin_id, "a": True})
            print("✅ Created 'admin@gmail.com'")

        # 3. Create a Dummy Hospital Admin
        print("🔍 Checking for existing Hospital Admins...")
        # Check if any user has hospital_admin_id
        count = conn.execute(text("SELECT COUNT(*) FROM users WHERE role_id = :rid"), {"rid": hospital_admin_id}).scalar()
        if count == 0:
            print("⚠️ No Hospital Admins found. Creating 'bruce.wayne@hospital.com'...")
            enc_email = encrypt_field("bruce.wayne@hospital.com")
            enc_pass = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" # "password"
            enc_fname = encrypt_field("Bruce")
            enc_lname = encrypt_field("Wayne")
            
            conn.execute(text("""
                INSERT INTO users (email, hashed_password, first_name, last_name, role_id, is_active)
                VALUES (:e, :p, :f, :l, :r, :a)
            """), {"e": enc_email, "p": enc_pass, "f": enc_fname, "l": enc_lname, "r": hospital_admin_id, "a": True})
            print("✅ Created Dummy Hospital Admin")
        else:
            print(f"✅ Found {count} Hospital Admins.")

        conn.commit()
        print("🎉 Data Fix Complete!")

if __name__ == "__main__":
    run_fix()
