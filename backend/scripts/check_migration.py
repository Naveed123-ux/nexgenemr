from sqlalchemy import create_engine, text
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)

def check_migrations():
    print("Checking migration version...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM alembic_version"))
        for row in result:
            print(f"Current Revision: {row[0]}")

if __name__ == "__main__":
    check_migrations()
