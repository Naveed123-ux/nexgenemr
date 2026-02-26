from sqlalchemy import create_engine, text
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)

def check_roles():
    print("🔍 Checking Roles (Raw)...")
    with engine.connect() as conn:
        roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        with open("c:\\nexgenemr\\backend\\roles_dump_v2.txt", "w") as f:
            for r in roles:
                line = f"Role ID: {r[0]} | Raw Name: {r[1]}\n"
                print(line.strip())
                f.write(line)

if __name__ == "__main__":
    check_roles()
