from sqlalchemy import create_engine, text
from db.db import DATABASE_URL
from utils.encryption import encrypt_field

engine = create_engine(DATABASE_URL)

def run_encryption_fix():
    print("🔐 Running Role Name Encryption Fix...")
    with engine.connect() as conn:
        # We need to find the roles with plain text names "Super_Admin" and "Hospital_Admin"
        # Since they are plain text, we can search for them directly.
        
        target_roles = ["Super_Admin", "Hospital_Admin"]
        
        for name in target_roles:
            print(f"Checking '{name}'...")
            # Check if exists as plain text
            result = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": name}).fetchone()
            
            if result:
                role_id = result[0]
                print(f"⚠️ Found PLAIN TEXT '{name}' at ID {role_id}. Encrypting...")
                
                encrypted_name = encrypt_field(name)
                conn.execute(text("UPDATE roles SET name = :enc_name WHERE id = :rid"), {"enc_name": encrypted_name, "rid": role_id})
                print(f"✅ Encrypted '{name}' at ID {role_id}")
            else:
                print(f"ℹ️ Plain text '{name}' not found. It might be already encrypted or missing.")

        conn.commit()
        print("🎉 Encryption Fix Complete!")

if __name__ == "__main__":
    run_encryption_fix()
