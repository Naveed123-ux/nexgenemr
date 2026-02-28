from sqlalchemy import create_engine, text
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)

def check_db_state():
    print("🔍 Checking Database State (Rows)...")
    with engine.connect() as conn:
        # 1. List all roles with raw names
        print("\n--- ROLES (Raw) ---")
        roles = conn.execute(text("SELECT id, name, isactive FROM roles")).fetchall()
        for r in roles:
            # Check if name contains 'Admin' (decrypted or raw)
            # Since we want to see raw, just print raw.
            # But to save space, let's look for known IDs or patterns.
            print(f"ID: {r[0]} | Name: {r[1]} | Active: {r[2]}")

        # 2. Check Permissions for raw 'messaging:read'
        print("\n--- PERMISSIONS (Raw Match 'messaging:%') ---")
        perms = conn.execute(text("SELECT id, name FROM permissions WHERE name LIKE 'messaging:%'")).fetchall()
        for p in perms:
            print(f"ID: {p[0]} | Name: {p[1]}")

        # 3. Check for 'bruce.wayne' user (encrypted presumably)
        # We'll just count how many users there are to see if it changed significantly, or print ID/RoleID
        print("\n--- USERS (ID, RoleID) ---")
        users = conn.execute(text("SELECT id, role_id FROM users")).fetchall()
        for u in users:
            print(f"UID: {u[0]} | RoleID: {u[1]}")

if __name__ == "__main__":
    check_db_state()
