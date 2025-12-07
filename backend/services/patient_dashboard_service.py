from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from models.user_model import User
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.appointment_session_model import AppointmentSession
from models.clinical_data_model import Vitals
from models.prescription_model import Prescription
from models.lab_result_model import LabResult

# --- Pydantic Schemas for the Dashboard ---

class DashboardAppointment(BaseModel):
    id: int
    doctor_name: str
    department_name: Optional[str] = "N/A"
    start_time: datetime
    is_telehealth: bool
    google_meet_link: Optional[str] = None

    class Config:
        from_attributes = True

class DashboardVital(BaseModel):
    id: int
    recorded_at: datetime
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    
    class Config:
        from_attributes = True

class DashboardMedication(BaseModel):
    id: int
    medication_name: str
    dosage: str
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    
    class Config:
        from_attributes = True
        
class DashboardLabResult(BaseModel):
    id: int
    test_name: str
    result: str
    date_reported: datetime
    
    class Config:
        from_attributes = True

class PatientDashboardResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    
    upcoming_appointments: List[DashboardAppointment]
    recent_vitals: Optional[DashboardVital] = None
    active_medications: List[DashboardMedication]
    recent_lab_results: List[DashboardLabResult]

    class Config:
        from_attributes = True

# --- Service Logic ---

def get_patient_dashboard(db: Session, current_user: User):
    """
    Gathers all relevant health information for the currently logged-in patient's dashboard.
    """
    if current_user.role.name != "Patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. User is not a patient.")
        
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    
    if not patient_profile:
        return PatientDashboardResponse(
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            email=current_user.email,
            upcoming_appointments=[],
            recent_vitals=None,
            active_medications=[],
            recent_lab_results=[]
        )

    # Fetch Upcoming Appointments
    upcoming_appointments_query = db.query(Appointment).join(AppointmentSession).filter(
        Appointment.patient_profile_id == patient_profile.id,
        AppointmentSession.start_time >= datetime.now()
    ).order_by(AppointmentSession.start_time).limit(5).all()
    
    upcoming_appointments = []
    for appt in upcoming_appointments_query:
        doctor = appt.doctor
        department_name = "N/A"
        if doctor.doctor_profile and doctor.doctor_profile.department:
            department_name = doctor.doctor_profile.department.name

        upcoming_appointments.append(DashboardAppointment(
            id=appt.id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            department_name=department_name,
            start_time=appt.session.start_time,
            is_telehealth=appt.is_telehealth,
            google_meet_link=appt.google_meet_link
        ))

    # Fetch Most Recent Vitals by joining through the Appointment and AppointmentSession tables
    latest_vitals_query = db.query(Vitals).join(Vitals.appointment).join(Appointment.session).filter(
        Appointment.patient_profile_id == patient_profile.id
    ).order_by(AppointmentSession.start_time.desc()).first()

    recent_vitals = None
    if latest_vitals_query and latest_vitals_query.appointment and latest_vitals_query.appointment.session:
        recent_vitals = DashboardVital(
            id=latest_vitals_query.id,
            recorded_at=latest_vitals_query.appointment.session.start_time,
            blood_pressure=latest_vitals_query.blood_pressure,
            heart_rate=latest_vitals_query.heart_rate,
            temperature=latest_vitals_query.temperature,
            respiratory_rate=latest_vitals_query.respiratory_rate,
        )

    # Fetch Active Medications using the user_id from the current user
    active_medications_query = db.query(Prescription).filter(
        Prescription.patient_user_id == current_user.id,
        (Prescription.end_date >= date.today()) | (Prescription.end_date == None)
    ).all()
    
    active_medications = [
        DashboardMedication(
            id=med.id,
            medication_name=med.medication, # Map 'medication' to 'medication_name'
            dosage=med.dosage,
            frequency=med.frequency,
            start_date=med.start_date,
            end_date=med.end_date
        ) for med in active_medications_query
    ]

    # Fetch Recent Lab Results
    recent_lab_results = db.query(LabResult).filter(
        LabResult.patient_user_id == patient_profile.id
    ).order_by(LabResult.result_date.desc()).limit(5).all()

    # Assemble and validate the dashboard response
    dashboard_data = {
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "upcoming_appointments": upcoming_appointments,
        "recent_vitals": recent_vitals,
        "active_medications": active_medications,
        "recent_lab_results": recent_lab_results
    }
    return PatientDashboardResponse.model_validate(dashboard_data)

