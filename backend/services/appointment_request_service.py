# services/appointment_request_service.py

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from models.appointment_request_model import AppointmentRequest, AppointmentRequestStatus
from models.patient_profile_model import PatientProfile
from models.appointment_session_model import AppointmentSession, SessionStatus  # <--- Import AppointmentSession and SessionStatus
from services.appointment_service import create_appointment, AppointmentCreate
from pydantic import BaseModel
from db.db import get_db
from models.user_model import User
# --- START OF CHANGES ---

class AppointmentRequestCreate(BaseModel):
    patient_user_id: int
    appointment_session_id: int
    is_telehealth: bool
    reason_for_visit: str

def create_appointment_request(request: AppointmentRequestCreate, db: Session, current_user: User):
    # 1. Validate the appointment slot
    slot = db.query(AppointmentSession).filter(AppointmentSession.id == request.appointment_session_id).first()
    if not slot or slot.status != SessionStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="This time slot is not available.")

    # 2. Find the patient's profile
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == request.patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {request.patient_user_id} not found.")

    # 3. Create the appointment request
    db_request = AppointmentRequest(
        patient_id=patient_profile.id,
        doctor_id=slot.doctor_user_id,
        start_time=slot.start_time,
        end_time=slot.end_time,
        status=AppointmentRequestStatus.PENDING.value
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

# --- END OF CHANGES ---


def get_pending_requests(db: Session = Depends(get_db)):
    return db.query(AppointmentRequest).filter(AppointmentRequest.status == AppointmentRequestStatus.PENDING.value).all()


def accept_appointment_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    # --- START OF CHANGES ---
    # Find the original slot to create the appointment
    slot = db.query(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == db_request.doctor_id,
        AppointmentSession.start_time == db_request.start_time
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Associated appointment slot not found.")

    # Create an appointment using the main service
    appointment_data = AppointmentCreate(
        patient_user_id=db_request.patient.user_id,
        appointment_session_id=slot.id,
        is_telehealth=False, # Or determine this from the request if needed
        reason_for_visit="Follow-up" # Or get this from the request
    )
    create_appointment(db, appointment_data, db_request.doctor) # Pass the doctor as the current_user

    # --- END OF CHANGES ---

    # Update the request status
    db_request.status = AppointmentRequestStatus.ACCEPTED.value
    db.commit()
    
    return {"message": "Appointment request accepted and appointment booked successfully"}


def decline_appointment_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Appointment request not found")
        
    db.delete(db_request)
    db.commit()

    return {"message": "Appointment request declined and removed successfully"}