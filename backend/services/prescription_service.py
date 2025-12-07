from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from models.prescription_model import Prescription, PrescriptionStatus
from models.patient_profile_model import PatientProfile
from models.user_model import User
from services.hospital_service import get_my_hospital
from models.appointment_model import Appointment

# Pydantic Schemas
class PrescriptionCreate(BaseModel):
    patient_user_id: int
    appointment_id: int
    medication: str
    dosage: str
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    patient_user_id: int
    appointment_id: int
    medication: str
    dosage: str
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None
    status: str
    doctor_name: str

    class Config:
        from_attributes = True

# Service Functions
def create_prescription(db: Session, prescription_data: PrescriptionCreate, current_user: User):
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == prescription_data.patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to create prescriptions for this patient.")

    new_prescription = Prescription(**prescription_data.dict(), status=PrescriptionStatus.ACTIVE)
    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)
    return new_prescription

def get_prescriptions_for_patient(db: Session, patient_user_id: int, current_user: User):
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to view prescriptions for this patient.")

    prescriptions = db.query(Prescription).options(
        joinedload(Prescription.appointment).joinedload(Appointment.doctor)
    ).filter(Prescription.patient_user_id == patient_user_id).order_by(Prescription.start_date.desc()).all()

    response = []
    for p in prescriptions:
        doctor = p.appointment.doctor
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "N/A"
        
        response.append(
            PrescriptionResponse(
                id=p.id,
                patient_user_id=p.patient_user_id,
                appointment_id=p.appointment_id,
                medication=p.medication,
                dosage=p.dosage,
                frequency=p.frequency,
                start_date=p.start_date,
                end_date=p.end_date,
                notes=p.notes,
                status=p.status,
                doctor_name=doctor_name
            )
        )
    return response

def cancel_prescription(db: Session, prescription_id: int, current_user: User):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == prescription.patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found for the given prescription.")

    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this prescription.")

    if prescription.status != "active":
        raise HTTPException(status_code=400, detail=f"Prescription is already in '{prescription.status}' status.")

    prescription.status = "cancelled"
    db.commit()
    return {"detail": "Prescription successfully cancelled."}

def delete_prescription(db: Session, prescription_id: int, current_user: User):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == prescription.patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found for the given prescription.")
        
    hospital_id = get_my_hospital(current_user, db).id
    if patient_profile.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this prescription.")

    db.delete(prescription)
    db.commit()
    return {"detail": "Prescription successfully deleted."}