from sqlalchemy import text, create_engine
import sys

# DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/nexgen"
db_url = 'postgresql://postgres:postgres@localhost:5432/nexgen'
engine = create_engine(db_url)

target_user_id = 83
target_hospital_id = 13

with engine.connect() as conn:
    print(f"--- CLEANUP START (User: {target_user_id}, Hospital: {target_hospital_id}) ---")
    
    # Check if user exists
    user = conn.execute(text(f"SELECT id FROM users WHERE id = {target_user_id}")).fetchone()
    if not user:
        print(f"User {target_user_id} not found. Skipping user deletion.")
    else:
        # Delete dependencies of Hospital 13
        print(f"Cleaning Hospital {target_hospital_id} dependencies...")
        # Departments
        conn.execute(text(f"DELETE FROM departments WHERE hospital_id = {target_hospital_id}"))
        # Hospital record
        conn.execute(text(f"DELETE FROM hospitals WHERE id = {target_hospital_id}"))
        
        # Delete dependencies of User 83
        print(f"Cleaning User {target_user_id} dependencies...")
        # Staff Profile
        conn.execute(text(f"DELETE FROM staff_profiles WHERE user_id = {target_user_id}"))
        
        # Finally delete User
        print(f"Deleting User {target_user_id}...")
        conn.execute(text(f"DELETE FROM users WHERE id = {target_user_id}"))
        
    conn.commit()
    print("--- CLEANUP SUCCESSFUL ---")
