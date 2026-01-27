"use client";

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

def ensure_patient_permissions():
    engine = create_engine(database_url)
    with engine.connect() as connection:
        print("🔧 Starting Patient permissions update...")

        # --- Helper Functions ---
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

        # --- 1. Ensure 'Patient' Role Exists ---
        patient_role_id = get_role_id("Patient")
        if not patient_role_id:
            print("❌ Patient role not found! Please ensure roles are seeded.")
            return

        # --- 2. Ensure 'lab:read:own' Permission Exists ---
        perm_name = "lab:read:own"
        perm_id = get_perm_id(perm_name)
        
        if not perm_id:
            print(f"⏳ Creating permission: {perm_name}")
            now_str = str(datetime.utcnow())
            connection.execute(
                text("INSERT INTO permissions (name, isactive, created_at, updated_at) VALUES (:name, :isactive, :created_at, :updated_at)"),
                {"name": encrypt_field(perm_name), "isactive": True, "created_at": encrypt_field(now_str), "updated_at": encrypt_field(now_str)}
            )
            connection.commit()
            perm_id = get_perm_id(perm_name)

        # --- 3. Link 'lab:read:own' to 'Patient' ---
        assoc = connection.execute(
            text("SELECT * FROM role_permissions WHERE role_id = :r_id AND permission_id = :p_id"),
            {"r_id": patient_role_id, "p_id": perm_id}
        ).fetchone()
        
        if not assoc:
            print(f"🔗 Linking {perm_name} to Patient role")
            connection.execute(
                text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r_id, :p_id)"),
                {"r_id": patient_role_id, "p_id": perm_id}
            )
            connection.commit()
            print("✅ Permission linked successfully.")
        else:
            print(f"✅ Patient role already has {perm_name} permission.")

if __name__ == "__main__":
    ensure_patient_permissions()
