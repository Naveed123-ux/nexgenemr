import pandas as pd
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from models.icd_code_model import ICDCode
from models.user_model import User
from models.role_model import Role
from models.permission_model import Permission
from models.hospital_model import Hospital
from models.department_model import Department
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.patient_profile_model import PatientProfile
from models.appointment_session_model import AppointmentSession
from models.appointment_model import Appointment
from models.availability_template_model import AvailabilityTemplate
from models.google_auth_token_model import GoogleAuthToken
from models.messaging_model import Conversation, ConversationParticipant, Message
from models.tracker_column_model import TrackerColumn
from models.clinical_data_model import MedicalHistory, Vitals
from models.soap_note_model import SoapNote
from models.hospital_request_model import HospitalRequest
from models.prescription_model import Prescription

# Pydantic Schemas
class ICDCodeResponse(BaseModel):
    id: int
    code: str
    description: str

    class Config:
        from_attributes = True

def load_icd_codes_from_file(db: Session):
    """
    One-time script to load ICD codes from an XLSX file into the database.
    """
    if db.query(ICDCode).first():
        print("ICD codes already loaded. Skipping.")
        return

    try:
        df = pd.read_excel('icd.xlsx', engine='openpyxl')
        
        if 'CODE' not in df.columns or 'LONG DESCRIPTION (VALID ICD-10 FY2025)' not in df.columns:
            raise ValueError("XLSX file must contain 'CODE' and 'LONG DESCRIPTION (VALID ICD-10 FY2025)' columns.")

        # Clean the data before inserting
        df['CODE'] = df['CODE'].astype(str).str.strip()
        df['LONG DESCRIPTION (VALID ICD-10 FY2025)'] = df['LONG DESCRIPTION (VALID ICD-10 FY2025)'].astype(str).str.strip()
        
        # Remove any rows with NaN values
        df = df.dropna(subset=['CODE', 'LONG DESCRIPTION (VALID ICD-10 FY2025)'])
        
        batch_size = 500
        total_rows = len(df)
        
        for start_idx in range(0, total_rows, batch_size):
            end_idx = min(start_idx + batch_size, total_rows)
            batch_df = df.iloc[start_idx:end_idx]
            
            print(f"Processing batch {start_idx//batch_size + 1} (rows {start_idx + 1} to {end_idx} of {total_rows})")
            
            for index, row in batch_df.iterrows():
                code = str(row['CODE']).strip()
                description = str(row['LONG DESCRIPTION (VALID ICD-10 FY2025)']).strip()
                
                # Skip empty entries
                if not code or not description or code.lower() == 'nan' or description.lower() == 'nan':
                    continue
                
                print(f"Inserting row {index + 2}: CODE={code}, DESCRIPTION={description[:50]}...")

                db_code = ICDCode(code=code, description=description)
                db.add(db_code)
            
            # Commit after each batch
            try:
                db.commit()
                print(f"Batch committed successfully")
            except Exception as batch_error:
                db.rollback()
                print(f"Error in batch: {batch_error}")
                raise
        
        print("\nSuccessfully loaded all ICD-10 codes from XLSX file.")
    except FileNotFoundError:
        print("ERROR: 'icd.xlsx' not found in the backend directory.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred while loading ICD codes: {e}")


def search_icd_codes(query: str, db: Session):
    """
    Searches for ICD codes by code or description.
    """
    search_term = f"%{query.lower()}%"
    return db.query(ICDCode).filter(
        (ICDCode.code.ilike(search_term)) | (ICDCode.description.ilike(search_term))
    ).limit(20).all()
