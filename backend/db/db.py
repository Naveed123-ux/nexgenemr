# db.py
from sqlalchemy import create_engine, MetaData # <-- ADD MetaData IMPORT
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=20,
    pool_timeout=60
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- START OF CHANGES ---

# 1. Define a MetaData object with the schema.
metadata_obj = MetaData(schema="public")

# 2. Pass the metadata to your declarative base.
Base = declarative_base(metadata=metadata_obj)

# --- END OF CHANGES ---


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()