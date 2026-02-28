from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.role_model import Role
from models.permission_model import Permission
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def list_roles():
    print("📋 Listing all roles in DB:")
    roles = db.query(Role).all()
    print([r.name for r in roles])

if __name__ == "__main__":
    list_roles()
