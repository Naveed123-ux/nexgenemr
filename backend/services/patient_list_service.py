from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.user_model import User
from services.hospital_service import get_my_hospital

from db.db import get_db

class PatientListResponse(BaseModel):
    patientID: int
    patient_name: str
    assigned_md: str
    visit_status: str
    chief_complaint: Optional[str] = None
    length_of_stay: str
    bay_or_room: Optional[str] = None
    triage_level: Optional[str] = None
    lab_status: Optional[str] = None

def get_patient_list(current_user: User, db: Session) -> List[PatientListResponse]:
    """
    Fetches and formats patient data for the tracker board for a specific doctor.
    Shows patients they have appointments with OR patients assigned to them.
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this list."
        )

    # Get patient profile IDs from appointments
    appointment_patient_ids = db.query(Appointment.patient_profile_id).filter(
        Appointment.doctor_user_id == current_user.id
    ).distinct().all()
    appointment_patient_ids = [pid[0] for pid in appointment_patient_ids]
    
    # Get patients either assigned to doctor OR with appointments
    query = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.assigned_doctor)
    )
    
    if appointment_patient_ids:
        all_patients = query.filter(
            (PatientProfile.assigned_doctor_id == current_user.id) | 
            (PatientProfile.id.in_(appointment_patient_ids))
        ).all()
    else:
        # No appointments, only show assigned patients
        all_patients = query.filter(
            PatientProfile.assigned_doctor_id == current_user.id
        ).all()

    patient_list_data = []
    for profile in all_patients:
        patient_name = "N/A"
        if profile.user:
            patient_name = f"{profile.user.first_name} {profile.user.last_name}"

        created_at_datetime = datetime.strptime(profile.user.created_at, "%Y-%m-%d %H:%M:%S.%f")
        los_delta = datetime.utcnow() - created_at_datetime
        hours, remainder = divmod(los_delta.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        los_str = f"{int(hours)}h {int(minutes)}m"
        
        doctor_name = "N/A"
        if profile.assigned_doctor:
            doctor_name = f"Dr. {profile.assigned_doctor.first_name} {profile.assigned_doctor.last_name}"

        patient_list_data.append(PatientListResponse(
            patientID=profile.user.id,
            patient_name=patient_name,
            assigned_md=doctor_name,
            visit_status="Active" if profile.status else "Inactive",
            chief_complaint=profile.chief_complaint,
            length_of_stay=los_str,
            bay_or_room=profile.bay_or_room,
            triage_level=profile.triage_level,
            lab_status=profile.lab_status,
        ))
    
    return patient_list_data

def get_all_patients_for_staff(current_user: User, db: Session) -> List[PatientListResponse]:
    """
    Fetches and formats patient data for the tracker board for staff members and doctors.
    """
    if current_user.role.name not in ["Doctor", "Receptionist", "Hospital_Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors, receptionists, and hospital admins can access this list."
        )

    # Get hospital ID based on role
    if current_user.role.name == "Doctor":
        if not current_user.doctor_profile or not current_user.doctor_profile.department:
            raise HTTPException(status_code=400, detail="Doctor profile or department not found")
        hospital_id = current_user.doctor_profile.department.hospital_id
    else:
        hospital_id = get_my_hospital(current_user, db).id
    
    all_patients = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.assigned_doctor)
    ).filter(PatientProfile.hospital_id == hospital_id).all()

    patient_list_data = []
    for profile in all_patients:
        patient_name = "N/A"
        if profile.user:
            patient_name = f"{profile.user.first_name} {profile.user.last_name}"

        created_at_datetime = datetime.strptime(profile.user.created_at, "%Y-%m-%d %H:%M:%S.%f")
        los_delta = datetime.utcnow() - created_at_datetime
        hours, remainder = divmod(los_delta.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        los_str = f"{int(hours)}h {int(minutes)}m"
        
        doctor_name = "N/A"
        if profile.assigned_doctor:
            doctor_name = f"Dr. {profile.assigned_doctor.first_name} {profile.assigned_doctor.last_name}"

        patient_list_data.append(PatientListResponse(
            patientID=profile.user.id,
            patient_name=patient_name,
            assigned_md=doctor_name,
            visit_status="Active" if profile.status else "Inactive",
            chief_complaint=profile.chief_complaint,
            length_of_stay=los_str,
            bay_or_room=profile.bay_or_room,
            triage_level=profile.triage_level,
            lab_status=profile.lab_status,
        ))
    
    return patient_list_data





def get_patient_list_for_hospital(current_user: User, db: Session) -> List[PatientListResponse]:
    """
    Fetches and formats patient data for authorized roles within a hospital.
    - Doctors see patients they have appointments with OR patients assigned to them.
    - Staff/Admins see all patients in the hospital.
    """
    user_role = current_user.role.name.strip() if current_user.role.name else ""
    print(f"🔍 DEBUG: User role name: '{user_role}' (type: {type(user_role)})")
    print(f"🔍 DEBUG: User ID: {current_user.id}")
    print(f"🔍 DEBUG: Role comparison - Doctor: {user_role == 'Doctor'}")
    
    query = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.assigned_doctor)
    )

    if user_role == "Doctor":
        # Doctors see patients they have appointments with OR patients assigned to them
        # Get patient profile IDs from appointments
        appointment_patient_ids = db.query(Appointment.patient_profile_id).filter(
            Appointment.doctor_user_id == current_user.id
        ).distinct().all()
        appointment_patient_ids = [pid[0] for pid in appointment_patient_ids]
        
        # Filter by either assigned_doctor_id OR patient profiles with appointments
        if appointment_patient_ids:
            all_patients = query.filter(
                (PatientProfile.assigned_doctor_id == current_user.id) | 
                (PatientProfile.id.in_(appointment_patient_ids))
            ).all()
        else:
            # No appointments, only show assigned patients
            all_patients = query.filter(
                PatientProfile.assigned_doctor_id == current_user.id
            ).all() 
    elif user_role in ["Receptionist", "Hospital_Admin"]:
        # Staff and Admins see all patients in their hospital
        hospital_id = get_my_hospital(current_user, db).id
        all_patients = query.filter(PatientProfile.hospital_id == hospital_id).all() 
    else:
        # Deny access to other roles
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this patient list."
        )

    patient_list_data = []
    for profile in all_patients:
        if not profile.user:
            continue

        patient_name = f"{profile.user.first_name} {profile.user.last_name}" 

        # Calculate Length of Stay (LOS) from user creation time
        created_at_datetime = datetime.strptime(profile.user.created_at, "%Y-%m-%d %H:%M:%S.%f")
        los_delta = datetime.utcnow() - created_at_datetime
        hours, remainder = divmod(los_delta.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        los_str = f"{int(hours)}h {int(minutes)}m" 

        doctor_name = "N/A"
        if profile.assigned_doctor:
            doctor_name = f"Dr. {profile.assigned_doctor.first_name} {profile.assigned_doctor.last_name}" 

        patient_list_data.append(PatientListResponse(
            patientID=profile.user.id,
            patient_name=patient_name,
            assigned_md=doctor_name,
            visit_status="Active" if profile.status else "Inactive", 
            chief_complaint=profile.chief_complaint, 
            length_of_stay=los_str,
            bay_or_room=profile.bay_or_room, 
            triage_level=profile.triage_level, 
            lab_status=profile.lab_status, 
        ))
    
    return patient_list_data