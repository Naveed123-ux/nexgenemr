import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from models.role_model import Role
from datetime import datetime

load_dotenv()
database_url = os.getenv("DATABASE_URL")

def verify_lab_role():
    engine = create_engine(database_url)
    with Session(engine) as session:
        role = session.query(Role).filter(Role.name == "Lab_Technician").first()
        if not role:
            print("⏳ 'Lab_Technician' role not found. Creating it...")
            new_role = Role(
                name="Lab_Technician",
                isactive=True,
                created_at=str(datetime.utcnow()),
                updated_at=str(datetime.utcnow())
            )
            session.add(new_role)
            session.commit()
            print("✅ 'Lab_Technician' role created successfully.")
        else:
            print("✅ 'Lab_Technician' role already exists.")

if __name__ == "__main__":
    verify_lab_role()
