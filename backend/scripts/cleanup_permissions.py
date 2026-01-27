import sys
import os

# Set up backend path for imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from utils.encryption import decrypt_field

load_dotenv()
database_url = os.getenv("DATABASE_URL")

def cleanup_permissions():
    engine = create_engine(database_url)
    with engine.connect() as connection:
        # 1. Get all permissions
        result = connection.execute(text("SELECT id, name, isactive FROM permissions")).fetchall()
        
        # Permissions we definitely want to KEEP
        valid_permissions = [
            "lab:request",
            "lab:read:all",
            "lab:read:own",
            "lab:accept",
            "lab:process",
            "lab:review"
        ]
        
        ids_to_delete = []
        
        print("🔍 Scanning permissions for cleanup...")
        for row in result:
            try:
                decrypted_name = decrypt_field(row.name)
            except Exception:
                # If it's plain text, we can check directly
                decrypted_name = row.name
            
            # Identify unwanted:
            # 1. Has "lab" in it but is NOT in our valid list
            # 2. Has typos (like "labrequets")
            # 3. Is inactive (row.isactive is False) AND starts with lab
            
            is_lab_related = any(kw in decrypted_name.lower() for kw in ["lab:", "labrequet", "labreport"])
            is_valid = decrypted_name in valid_permissions
            
            if is_lab_related and not is_valid:
                print(f"❌ Found unwanted lab permission: '{decrypted_name}' (ID: {row.id}, Active: {row.isactive})")
                ids_to_delete.append(row.id)
            elif is_lab_related and is_valid and not row.isactive:
                print(f"❌ Found inactive but valid permission (candidate for cleanup/reset): '{decrypted_name}' (ID: {row.id})")
                ids_to_delete.append(row.id)

        if not ids_to_delete:
            print("✅ No unwanted permissions found.")
            return

        print(f"\n🗑️ Deleting {len(ids_to_delete)} permissions and their associations...")
        
        # Delete from association table first to avoid FK constraint issues
        connection.execute(
            text("DELETE FROM role_permissions WHERE permission_id IN :ids"),
            {"ids": tuple(ids_to_delete)}
        )
        
        # Delete from permissions table
        connection.execute(
            text("DELETE FROM permissions WHERE id IN :ids"),
            {"ids": tuple(ids_to_delete)}
        )
        
        connection.commit()
        print("✅ Cleanup completed successfully.")

if __name__ == "__main__":
    cleanup_permissions()
