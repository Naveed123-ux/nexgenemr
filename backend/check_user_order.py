import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('c:/nexgenemr/backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- User Order in DB ---")
    users = conn.execute(text("SELECT id, email FROM users")).fetchall()
    for user in users:
        print(f"ID: {user[0]}")
