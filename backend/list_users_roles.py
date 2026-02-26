from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import decrypt_field

engine = create_engine(DATABASE_URL)

def list_users_and_roles():
    print("📋 Listing Users and Roles via Raw SQL...")
    with engine.connect() as conn:
        # Get all roles first
        roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        role_map = {r[0]: r[1] for r in roles}
        print(f"Roles found: {role_map}")

        if not role_map:
            print("No roles found!")

        # Get all users
        users = conn.execute(text("SELECT id, email, first_name, last_name, role_id FROM users")).fetchall()

        if not users:
            print("No users found!")
            return

        print(f"\nTotal Users: {len(users)}")
        hospital_admin_count = 0
        
        for u in users:
            uid, enc_email, enc_fname, enc_lname, role_id = u
            
            email = "N/A"
            try:
                email = decrypt_field(enc_email)
            except Exception as e:
                email = f"[Encrypted] {str(e)}"
                
            name = "N/A"
            try:
                name = f"{decrypt_field(enc_fname)} {decrypt_field(enc_lname)}"
            except:
                name = "[Encrypted]"
                
            role_name = role_map.get(role_id, f"Unknown ID ({role_id})")
            
            print(f" - ID: {uid} | {email} | Role: {role_name} ({role_id})")
            
            if role_name == "Hospital_Admin":
                hospital_admin_count += 1

        print(f"\nTotal Hospital Admins found: {hospital_admin_count}")

if __name__ == "__main__":
    list_users_and_roles()
