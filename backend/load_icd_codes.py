from db.db import SessionLocal
from services.icd_code_service import load_icd_codes_from_file

from models.user_model import User
from models.patient_profile_model import PatientProfile

db = SessionLocal()
try:
    load_icd_codes_from_file(db)
finally:
    db.close()
    print("Database connection closed.")