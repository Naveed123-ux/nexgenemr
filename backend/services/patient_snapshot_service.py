from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.clinical_data_model import MedicalHistory, Vitals
from models.soap_note_model import SoapNote
from models.user_model import User


# Pydantic Response Models
class CareTeamMember(BaseModel):
    user_id: int
    name: str
    role: str
    specialization: Optional[str] = None

    class Config:
        from_attributes = True


class VitalsSnapshot(BaseModel):
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    pain_level: Optional[str] = None

    class Config:
        from_attributes = True


class SoapNoteSnapshot(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None

    class Config:
        from_attributes = True


class JourneyEntry(BaseModel):
    appointment_id: int
    date: datetime
    doctor_name: str
    reason_for_visit: Optional[str] = None
    vitals: Optional[VitalsSnapshot] = None
    soap_note: Optional[SoapNoteSnapshot] = None

    class Config:
        from_attributes = True


class PatientHeader(BaseModel):
    profile_id: int
    full_name: str
    email: EmailStr
    care_team: List[CareTeamMember]
    medical_history: Dict[str, List[str]]
    # --- START OF CHANGES ---
    chief_complaint: Optional[str] = None
    bay_or_room: Optional[str] = None
    triage_level: Optional[str] = None
    lab_status: Optional[str] = None
    # --- END OF CHANGES ---

    class Config:
        from_attributes = True


class PatientSnapshotResponse(BaseModel):
    header: PatientHeader
    journey: List[JourneyEntry]

    class Config:
        from_attributes = True


def get_patient_snapshot(patient_user_id: int, current_user: User, db: Session) -> PatientSnapshotResponse:
    """
    Retrieves a comprehensive snapshot of a patient's medical records including:
    - Basic profile information
    - Care team (assigned doctor and hospital staff)
    - Medical history (allergies, medications, past conditions)
    - Journey (timeline of appointments with vitals and SOAP notes)
    """
    
    # 1. Fetch patient profile with relationships
    patient_profile = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.hospital),
        joinedload(PatientProfile.assigned_doctor).joinedload(User.doctor_profile),
        joinedload(PatientProfile.medical_history)
    ).filter(PatientProfile.user_id == patient_user_id).first()

    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient profile with user ID {patient_user_id} not found."
        )

    # 3. Build care team
    care_team = []
    
    # Add assigned doctor
    if patient_profile.assigned_doctor:
        doctor = patient_profile.assigned_doctor
        care_team.append(CareTeamMember(
            user_id=doctor.id,
            name=f"Dr. {doctor.first_name} {doctor.last_name}",
            role="Primary Physician",
            specialization=doctor.doctor_profile.specialization if doctor.doctor_profile else None
        ))

    # 4. Build medical history dictionary
    medical_history_dict = {
        "allergies": [],
        "current_medications": [],
        "past_medical_history": []
    }
    
    if patient_profile.medical_history:
        med_hist = patient_profile.medical_history
        medical_history_dict["allergies"] = med_hist.allergies if med_hist.allergies else []
        medical_history_dict["current_medications"] = med_hist.current_medications if med_hist.current_medications else []
        medical_history_dict["past_medical_history"] = med_hist.past_medical_history if med_hist.past_medical_history else []

    # 5. Build patient header
    header = PatientHeader(
        profile_id=patient_profile.user.id,
        full_name=f"{patient_profile.user.first_name} {patient_profile.user.last_name}",
        email=patient_profile.user.email,
        care_team=care_team,
        medical_history=medical_history_dict,
        # --- START OF CHANGES ---
        chief_complaint=patient_profile.chief_complaint,
        bay_or_room=patient_profile.bay_or_room,
        triage_level=patient_profile.triage_level,
        lab_status=patient_profile.lab_status
        # --- END OF CHANGES ---
    )

    # 6. Fetch all appointments for this patient with related data
    appointments = db.query(Appointment).options(
        joinedload(Appointment.session),
        joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        joinedload(Appointment.vitals)
    ).filter(
        Appointment.patient_profile_id == patient_profile.id
    ).order_by(Appointment.id.desc()).all()

    # 7. Build journey entries
    journey = []
    
    for appointment in appointments:
        # Get vitals if they exist
        vitals_data = None
        if appointment.vitals:
            vitals_data = VitalsSnapshot(
                blood_pressure=appointment.vitals.blood_pressure,
                heart_rate=appointment.vitals.heart_rate,
                respiratory_rate=appointment.vitals.respiratory_rate,
                temperature=appointment.vitals.temperature,
                oxygen_saturation=appointment.vitals.oxygen_saturation,
                pain_level=appointment.vitals.pain_level
            )

        # Get SOAP note if it exists
        soap_note_data = None
        soap_note = db.query(SoapNote).filter(
            SoapNote.appointment_id == appointment.id
        ).first()
        
        if soap_note:
            soap_note_data = SoapNoteSnapshot(
                subjective=soap_note.subjective or "Not documented",
                objective=soap_note.objective or "Not documented",
                assessment=soap_note.assessment or "Not documented",
                plan=soap_note.plan or "Not documented"
            )

        # Build doctor name
        doctor_name = f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}"
        if appointment.doctor.doctor_profile and appointment.doctor.doctor_profile.department:
            doctor_name += f" ({appointment.doctor.doctor_profile.department.name})"

        # Create journey entry
        journey.append(JourneyEntry(
            appointment_id=appointment.id,
            date=appointment.session.start_time,
            doctor_name=doctor_name,
            reason_for_visit=appointment.reason_for_visit,
            vitals=vitals_data,
            soap_note=soap_note_data
        ))

    # 8. Return complete snapshot
    return PatientSnapshotResponse(
        header=header,
        journey=journey
    )