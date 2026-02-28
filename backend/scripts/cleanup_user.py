from sqlalchemy import text, create_engine
import sys

# Load .env manually
with open('.env', 'r') as f:
    env_vars = {}
    for line in f:
        if '=' in line and not line.startswith('#'):
            parts = line.strip().split('=', 1)
            if len(parts) == 2:
                key, val = parts
                env_vars[key] = val.strip('"')

db_url = env_vars.get("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found")
    sys.exit(1)

engine = create_engine(db_url)

user_id_to_delete = 83

with engine.connect() as conn:
    print(f"Checking dependencies for User ID {user_id_to_delete}...")
    
    # Check Hospital
    h_res = conn.execute(text(f"SELECT id, name FROM hospitals WHERE admin_user_id = {user_id_to_delete}")).fetchone()
    if h_res:
        print(f"CRITICAL: User 83 is admin for Hospital: {h_res[1]} (ID: {h_res[0]})")
        print("Aborting deletion. Needs redistribution of hospital ownership.")
    else:
        print("No hospital association found.")
        
        # Check Staff Profile
        s_res = conn.execute(text(f"SELECT id FROM staff_profiles WHERE user_id = {user_id_to_delete}")).fetchone()
        if s_res:
            print(f"Staff Profile found (ID: {s_res[0]}). Deleting it first.")
            conn.execute(text(f"DELETE FROM staff_profiles WHERE user_id = {user_id_to_delete}"))
        
        # Finally delete User
        print(f"Deleting User ID {user_id_to_delete}...")
        conn.execute(text(f"DELETE FROM users WHERE id = {user_id_to_delete}"))
        conn.commit()
        print("Success.")
