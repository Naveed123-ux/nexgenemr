from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import date 

# Import all necessary models
from models.clinical_data_model import Vitals, MedicalHistory
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.appointment_session_model import AppointmentSession
from services.hospital_service import get_my_hospital
from models.user_model import User

# Pydantic Schemas for Vitals
class VitalsCreate(BaseModel):
    blood_pressure: str
    heart_rate: int
    respiratory_rate: int
    temperature: float
    oxygen_saturation: int
    pain_level: str

class VitalsUpdate(BaseModel):
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    pain_level: Optional[str] = None


class VitalsResponse(BaseModel):
    id: int
    appointment_id: int
    blood_pressure: str
    heart_rate: int
    respiratory_rate: int
    temperature: float
    oxygen_saturation: int
    pain_level: str

    class Config:
        from_attributes = True

class PatientVitalsHistoryResponse(BaseModel):
    appointment_id: int
    appointment_date: date
    vitals: VitalsResponse

# Pydantic Schemas for Medical History
class MedicalHistoryCreate(BaseModel):
    allergies: List[str]
    current_medications: List[str]
    past_medical_history: List[str]

class MedicalHistoryResponse(BaseModel):
    id: int
    patient_profile_id: int
    allergies: List[str]
    current_medications: List[str]
    past_medical_history: List[str]

    class Config:
        from_attributes = True

# Service Functions
def add_vitals_for_appointment(patient_user_id: int, appointment_id: int, vitals_data: VitalsCreate, db: Session):
    
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {patient_user_id} not found.")

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment with ID {appointment_id} not found.")
    
    if appointment.patient_profile_id != patient_profile.id:
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Appointment {appointment_id} does not belong to patient with user ID {patient_user_id}."
        )
    
        
    if appointment.vitals:
        raise HTTPException(status_code=400, detail="Vitals already exist for this appointment.")

    new_vitals = Vitals(
        appointment_id=appointment_id,
        **vitals_data.dict()
    )
    db.add(new_vitals)
    db.commit()
    db.refresh(new_vitals)
    return new_vitals

def create_or_update_medical_history(patient_user_id: int, history_data: MedicalHistoryCreate, db: Session):
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {patient_user_id} not found.")

    history_record = patient_profile.medical_history
    if history_record:
        # Update existing history
        update_data = history_data.dict()
        for key, value in update_data.items():
            setattr(history_record, key, value)
    else:
        # Create new history
        history_record = MedicalHistory(
            patient_profile_id=patient_profile.id,
            **history_data.dict()
        )
        db.add(history_record)

    db.commit()
    db.refresh(history_record)
    return history_record

def get_medical_history(patient_user_id: int, db: Session):
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile or not patient_profile.medical_history:
        raise HTTPException(status_code=404, detail=f"Medical history not found for patient with user ID {patient_user_id}.")
    return patient_profile.medical_history

def get_all_vitals_for_patient(patient_user_id: int, db: Session) -> List[PatientVitalsHistoryResponse]:
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        return []

    appointments = db.query(Appointment).filter(Appointment.patient_profile_id == patient_profile.id).all()
    if not appointments:
        return []

    appointment_ids = [appt.id for appt in appointments]

    # --- START OF CHANGES ---
    vitals_records = db.query(Vitals).options(
        joinedload(Vitals.appointment).joinedload(Appointment.session)
    ).filter(
        Vitals.appointment_id.in_(appointment_ids)
    ).join(Vitals.appointment).join(Appointment.session).order_by(
        AppointmentSession.start_time.desc()
    ).all()
    
    response = [
        PatientVitalsHistoryResponse(
            appointment_id=record.appointment_id,
            appointment_date=record.appointment.session.start_time.date(),
            vitals=VitalsResponse.from_orm(record)
        ) for record in vitals_records
    ]
    
    return response

def update_vitals(vitals_id: int, vitals_data: VitalsUpdate, db: Session, current_user: User):
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals record not found.")

    appointment = vitals.appointment
    patient_profile = appointment.patient
    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to update vitals for this patient.")

    update_data = vitals_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vitals, key, value)

    db.commit()
    db.refresh(vitals)
    return vitals

def delete_vitals(vitals_id: int, db: Session, current_user: User):
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals record not found.")

    appointment = vitals.appointment
    patient_profile = appointment.patient
    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete vitals for this patient.")

    db.delete(vitals)
    db.commit()
    return {"detail": "Vitals record successfully deleted."}