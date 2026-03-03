"""
Fix messaging permissions for ALL roles in the database.
Ensures messaging:read and messaging:create are assigned to every role.
"""
from sqlalchemy import create_engine, text
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)

ALL_ROLES = [
    "Super_Admin",
    "Hospital_Admin",
    "Doctor",
    "Staff",
    "Lab_Technician",
    "Receptionist",
    "Patient",
]

PERMISSIONS = ["messaging:read", "messaging:create"]

def fix():
    print("🔧 Fixing messaging permissions for ALL roles...\n")
    with engine.connect() as conn:
        # 1. Ensure permissions exist
        perm_ids = {}
        for perm_name in PERMISSIONS:
            row = conn.execute(
                text("SELECT id FROM permissions WHERE name = :name"),
                {"name": perm_name}
            ).fetchone()
            if row:
                perm_ids[perm_name] = row[0]
                print(f"  ✅ Permission '{perm_name}' exists (id={row[0]})")
            else:
                r = conn.execute(
                    text("INSERT INTO permissions (name, isactive) VALUES (:name, true) RETURNING id"),
                    {"name": perm_name}
                )
                new_id = r.fetchone()[0]
                perm_ids[perm_name] = new_id
                print(f"  ➕ Created permission '{perm_name}' (id={new_id})")

        print()

        # 2. Get all roles
        rows = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        all_roles = {r[1]: r[0] for r in rows}
        print(f"  📋 Found roles in DB: {list(all_roles.keys())}\n")

        # 3. Assign messaging permissions to every role
        for role_name in ALL_ROLES:
            role_id = all_roles.get(role_name)
            if not role_id:
                print(f"  ⚠️  Role '{role_name}' not found in DB — skipping")
                continue

            for perm_name, perm_id in perm_ids.items():
                existing = conn.execute(
                    text("SELECT 1 FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"),
                    {"rid": role_id, "pid": perm_id}
                ).fetchone()
                if existing:
                    print(f"  ✅ {role_name} already has '{perm_name}'")
                else:
                    conn.execute(
                        text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)"),
                        {"rid": role_id, "pid": perm_id}
                    )
                    print(f"  🔗 Linked '{perm_name}' → {role_name}")

        conn.commit()
        print("\n🎉 All messaging permissions fixed!")

if __name__ == "__main__":
    fix()
