from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import encrypt_field

engine = create_engine(DATABASE_URL)

def run_raw_sql_fix():
    print("🔧 Running RAW SQL fix for Super Admin permissions...")
    with engine.connect() as conn:
        # 1. Check if Super_Admin role exists
        result = conn.execute(text("SELECT id, name FROM roles WHERE name = :name"), {"name": "Super_Admin"}).fetchone()
        
        role_id = None
        if result:
            role_id = result[0]
            print(f"✅ Found Super_Admin role ID: {role_id}")
        else:
            print("⚠️ Super_Admin role not found. Creating it...")
            # Insert active=1
            r = conn.execute(text("INSERT INTO roles (name, isactive) VALUES (:name, :act) RETURNING id"), {"name": "Super_Admin", "act": True})
            role_id = r.fetchone()[0]
            print(f"✅ Created Super_Admin role ID: {role_id}")

        # 2. Check Permissions
        required = ["messaging:read", "messaging:create"]
        perm_ids = []
        for slug in required:
            res = conn.execute(text("SELECT id FROM permissions WHERE name = :name"), {"name": slug}).fetchone()
            p_id = None
            if res:
                p_id = res[0]
                print(f"✅ Found permission '{slug}' ID: {p_id}")
            else:
                print(f"⚠️ Permission '{slug}' not found. Creating...")
                # Insert active=1
                r = conn.execute(text("INSERT INTO permissions (name, isactive) VALUES (:name, :act) RETURNING id"), {"name": slug, "act": True})
                p_id = r.fetchone()[0]
                print(f"✅ Created permission '{slug}' ID: {p_id}")
            perm_ids.append(p_id)

        # 3. Link permissions to role
        for p_id in perm_ids:
            # Check if link exists
            link = conn.execute(text("SELECT * FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"), {"rid": role_id, "pid": p_id}).fetchone()
            if not link:
                print(f"🔗 Linking permission {p_id} to role {role_id}")
                conn.execute(text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)"), {"rid": role_id, "pid": p_id})
            else:
                print(f"✅ Permission {p_id} already linked to role {role_id}")

        # 4. Ensure admin@gmail.com has this role
        target_email = "admin@gmail.com"
        # We need to search encrypted or decrypted?
        # The user model encrypts email. But let's try searching by encrypted value.
        encrypted_email = encrypt_field(target_email)
        
        # Searching by email might be tricky due to encryption salt/iv being random unless deterministic.
        # Assuming we can find by ID 1 if it's the first user or just assume user ID 1 is admin.
        # Let's verify user 1.
        
        u1 = conn.execute(text("SELECT id, email, role_id FROM users WHERE id = 1")).fetchone()
        if u1:
            print(f"👤 User 1 Role ID: {u1[2]}")
            if u1[2] != role_id:
                print(f"⚠️ User 1 has incorrect role {u1[2]}. Updating to {role_id}...")
                conn.execute(text("UPDATE users SET role_id = :rid WHERE id = 1"), {"rid": role_id})
                print("✅ Updated User 1 role.")
            else:
                print("✅ User 1 already has Super_Admin role.")
        
        conn.commit()
        print("🎉 Fix complete!")

if __name__ == "__main__":
    run_raw_sql_fix()
