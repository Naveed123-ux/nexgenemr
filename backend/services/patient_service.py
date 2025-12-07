from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import or_, String, cast, distinct
from db.db import get_db
from models.user_model import User
from models.role_model import Role
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.doctor_profile_model import DoctorProfile
from services.user_service import get_password_hash
from services.hospital_service import generate_temporary_password , get_my_hospital
from utils.email_utils import send_welcome_email

class PatientCreate(BaseModel):
    # Core Info
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    client_type: str
    billing_type: str

    # --- START OF CHANGES ---
    # New intake fields
    chief_complaint: Optional[str] = None
    bay_or_room: Optional[str] = None
    triage_level: Optional[str] = None
    lab_status: Optional[str] = None
    # --- END OF CHANGES ---

    # Insurance Info (optional)
    insurer_name: Optional[str] = None
    member_id: Optional[str] = None
    group_id: Optional[str] = None
    subscriber_first_name: Optional[str] = None
    subscriber_last_name: Optional[str] = None
    subscriber_dob: Optional[date] = None
    subscriber_relationship_to_patient: Optional[str] = None

class PatientResponse(BaseModel):
    user_id: int
    profile_id: int
    email: EmailStr
    full_name: str
    status: bool
    assigned_doctor_id: Optional[int] = None

    class Config:
        from_attributes = True

class PatientDetailResponse(BaseModel):
    user_id: int
    profile_id: int
    email: EmailStr
    first_name: str
    last_name: str
    billing_type: str
    status: bool
    assigned_doctor_id: Optional[int] = None
    
    # --- START OF CHANGES ---
    chief_complaint: Optional[str] = None
    bay_or_room: Optional[str] = None
    triage_level: Optional[str] = None
    lab_status: Optional[str] = None
    # --- END OF CHANGES ---
    
    insurer_name: Optional[str] = None
    member_id: Optional[str] = None
    group_id: Optional[str] = None
    subscriber_first_name: Optional[str] = None
    subscriber_last_name: Optional[str] = None
    subscriber_dob: Optional[date] = None
    subscriber_relationship_to_patient: Optional[str] = None
    
    class Config:
        from_attributes = True

class HospitalPatientResponse(BaseModel):
    """Enhanced response model for hospital admin view with additional administrative fields"""
    user_id: int
    profile_id: int
    email: EmailStr
    full_name: str
    client_type: str
    billing_type: str
    status: bool
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    
    # Clinical status fields
    chief_complaint: Optional[str] = None
    bay_or_room: Optional[str] = None
    triage_level: Optional[str] = None
    lab_status: Optional[str] = None
    
    # Insurance summary
    insurer_name: Optional[str] = None
    member_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class AssociatedDoctorResponse(BaseModel):
    """Response model for doctors associated with a patient"""
    user_id: int
    full_name: str
    email: EmailStr
    specialization: str
    department_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_assigned_doctor: bool
    relationship_type: str  # "assigned" or "appointment_history"
    
    class Config:
        from_attributes = True

def create_patient(db: Session, patient_data: PatientCreate, current_user: User):
    db.begin_nested()
    try:
        user_role = current_user.role.name
        if user_role == "Hospital_Admin":
            hospital_id = current_user.hospital.id
        elif user_role == "Doctor":
            hospital_id = current_user.doctor_profile.department.hospital_id
        elif user_role == "Receptionist":
            if not current_user.staff_profile:
                raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
            hospital_id = current_user.staff_profile.hospital_id
        else:
            raise HTTPException(status_code=403, detail="Your role cannot create patients.")

        all_roles = db.query(Role).all()
        patient_role = next((role for role in all_roles if role.name == "Patient"), None)
        if not patient_role:
            raise HTTPException(status_code=500, detail="The 'Patient' role has not been configured.")

        if db.query(User).filter(User.email == patient_data.email).first():
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

        temp_password = generate_temporary_password()
        new_user = User(
            email=patient_data.email,
            hashed_password=get_password_hash(temp_password),
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            role_id=patient_role.id,
            created_at=str(datetime.utcnow()),
            updated_at=str(datetime.utcnow())
        )
        db.add(new_user)
        db.flush()

        is_active = False
        assigned_doctor_id = None
        if user_role == "Doctor":
            is_active = True
            assigned_doctor_id = current_user.id

        new_patient_profile = PatientProfile(
            user_id=new_user.id,
            hospital_id=hospital_id,
            status=is_active,
            assigned_doctor_id=assigned_doctor_id,
            client_type=patient_data.client_type,
            billing_type=patient_data.billing_type,
            # --- START OF CHANGES ---
            chief_complaint=patient_data.chief_complaint,
            bay_or_room=patient_data.bay_or_room,
            triage_level=patient_data.triage_level,
            lab_status=patient_data.lab_status,
            # --- END OF CHANGES ---
            insurer_name=patient_data.insurer_name,
            member_id=patient_data.member_id,
            group_id=patient_data.group_id,
            subscriber_first_name=patient_data.subscriber_first_name,
            subscriber_last_name=patient_data.subscriber_last_name,
            subscriber_dob=patient_data.subscriber_dob,
            subscriber_relationship_to_patient=patient_data.subscriber_relationship_to_patient
        )
        db.add(new_patient_profile)

        send_welcome_email(patient_data.email, temp_password)

        db.commit()
        
        return PatientResponse(
            user_id=new_user.id,
            profile_id=new_patient_profile.id,
            email=new_user.email,
            full_name=f"{new_user.first_name} {new_user.last_name}",
            status=new_patient_profile.status,
            assigned_doctor_id=new_patient_profile.assigned_doctor_id
        )

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def get_all_patients(current_user: User, db: Session):
    user_role = current_user.role.name

    if user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        if user_role == "Hospital_Admin":
            hospital_id = current_user.hospital.id
        else:
            if not current_user.staff_profile:
                 raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
            hospital_id = current_user.staff_profile.hospital_id
        
        profiles = db.query(PatientProfile).filter(PatientProfile.hospital_id == hospital_id).options(joinedload(PatientProfile.user)).all()
    elif user_role == "Doctor":
        profiles = db.query(PatientProfile).filter(PatientProfile.assigned_doctor_id == current_user.id).options(joinedload(PatientProfile.user)).all()
    else:
        return []

    return [
        PatientResponse(
            user_id=p.user.id,
            profile_id=p.id,
            email=p.user.email,
            full_name=f"{p.user.first_name} {p.user.last_name}",
            status=p.status,
            assigned_doctor_id=p.assigned_doctor_id
        ) for p in profiles
    ]

def search_patients(current_user, db, q: str, page: int = 1, limit: int = 10):
    query = db.query(PatientProfile).options(joinedload(PatientProfile.user))
    patients = query.all()

    search_lower = q.lower()
    filtered = [
        {
            "user_id": p.user.id,
            "profile_id": p.id,
            "email": p.user.email,
            "full_name": f"{p.user.first_name} {p.user.last_name}".strip(),
            "status": p.status,
            "assigned_doctor_id": p.assigned_doctor_id
        }
        for p in patients
        if (search_lower in (p.user.first_name or "").lower() 
            or search_lower in (p.user.last_name or "").lower()
            or search_lower in (p.user.email or "").lower())
    ]

    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]

    return {
        "data": paginated,
        "total": len(filtered),
        "page": page,
        "hasMore": end < len(filtered)
    }


def get_patient_by_id(patient_profile_id: int, current_user: User, db: Session):
    profile = db.query(PatientProfile).options(
        joinedload(PatientProfile.user)
    ).filter(PatientProfile.id == patient_profile_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    user_hospital = get_my_hospital(current_user, db)
    if profile.hospital_id != user_hospital.id and current_user.role.name != "Super_Admin":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this patient's records."
        )

    return PatientDetailResponse(
        user_id=profile.user.id,
        profile_id=profile.id,
        email=profile.user.email,
        first_name=profile.user.first_name,
        last_name=profile.user.last_name,
        client_type=profile.client_type,
        billing_type=profile.billing_type,
        status=profile.status,
        assigned_doctor_id=profile.assigned_doctor_id,
        # --- START OF CHANGES ---
        chief_complaint=profile.chief_complaint,
        bay_or_room=profile.bay_or_room,
        triage_level=profile.triage_level,
        lab_status=profile.lab_status,
        # --- END OF CHANGES ---
        insurer_name=profile.insurer_name,
        member_id=profile.member_id,
        group_id=profile.group_id,
        subscriber_first_name=profile.subscriber_first_name,
        subscriber_last_name=profile.subscriber_last_name,
        subscriber_dob=profile.subscriber_dob,
        subscriber_relationship_to_patient=profile.subscriber_relationship_to_patient
    )

def get_hospital_patients(current_user: User, db: Session):
    """
    Dedicated function for hospital admins to view all patients in their hospital.
    Provides better role-based filtering and error handling.
    """
    user_role = current_user.role.name
    
    # Determine hospital_id based on user role
    if user_role == "Hospital_Admin":
        if not current_user.hospital:
            raise HTTPException(status_code=403, detail="Hospital not found for this admin.")
        hospital_id = current_user.hospital.id
        
    elif user_role in ["Receptionist", "Staff"]:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
        hospital_id = current_user.staff_profile.hospital_id
        
    elif user_role == "Doctor":
        # Doctors can only see their assigned patients
        if not current_user.doctor_profile or not current_user.doctor_profile.department:
            raise HTTPException(status_code=403, detail="Doctor profile or department not found.")
        hospital_id = current_user.doctor_profile.department.hospital_id
        
        # Filter by assigned doctor for doctors
        profiles = db.query(PatientProfile).filter(
            PatientProfile.assigned_doctor_id == current_user.id,
            PatientProfile.hospital_id == hospital_id
        ).options(joinedload(PatientProfile.user)).all()
        
    else:
        raise HTTPException(
            status_code=403, 
            detail="Your role does not have permission to view hospital patients."
        )
    
    # For Hospital Admin, Receptionist, and Staff - get all patients in hospital
    if user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        profiles = db.query(PatientProfile).filter(
            PatientProfile.hospital_id == hospital_id
        ).options(joinedload(PatientProfile.user)).all()
    
    # Transform to response format
    return [
        PatientResponse(
            user_id=p.user.id,
            profile_id=p.id,
            email=p.user.email,
            full_name=f"{p.user.first_name} {p.user.last_name}",
            status=p.status,
            assigned_doctor_id=p.assigned_doctor_id
        ) for p in profiles
    ]

def get_hospital_patients_detailed(current_user: User, db: Session):
    """
    Enhanced function for hospital admins to view all patients with detailed information.
    Includes doctor names, clinical status, and administrative details.
    """
    user_role = current_user.role.name
    
    # Determine hospital_id based on user role
    if user_role == "Hospital_Admin":
        if not current_user.hospital:
            raise HTTPException(status_code=403, detail="Hospital not found for this admin.")
        hospital_id = current_user.hospital.id
        
    elif user_role in ["Receptionist", "Staff"]:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
        hospital_id = current_user.staff_profile.hospital_id
        
    elif user_role == "Doctor":
        # Doctors can only see their assigned patients
        if not current_user.doctor_profile or not current_user.doctor_profile.department:
            raise HTTPException(status_code=403, detail="Doctor profile or department not found.")
        hospital_id = current_user.doctor_profile.department.hospital_id
        
        # Filter by assigned doctor for doctors
        profiles = db.query(PatientProfile).filter(
            PatientProfile.assigned_doctor_id == current_user.id,
            PatientProfile.hospital_id == hospital_id
        ).options(
            joinedload(PatientProfile.user),
            joinedload(PatientProfile.assigned_doctor)
        ).all()
        
    else:
        raise HTTPException(
            status_code=403, 
            detail="Your role does not have permission to view hospital patients."
        )
    
    # For Hospital Admin, Receptionist, and Staff - get all patients in hospital
    if user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        profiles = db.query(PatientProfile).filter(
            PatientProfile.hospital_id == hospital_id
        ).options(
            joinedload(PatientProfile.user),
            joinedload(PatientProfile.assigned_doctor)
        ).all()
    
    # Transform to enhanced response format
    result = []
    for p in profiles:
        # Get assigned doctor name if available
        assigned_doctor_name = None
        if p.assigned_doctor:
            assigned_doctor_name = f"{p.assigned_doctor.first_name} {p.assigned_doctor.last_name}"
        
        result.append(HospitalPatientResponse(
            user_id=p.user.id,
            profile_id=p.id,
            email=p.user.email,
            full_name=f"{p.user.first_name} {p.user.last_name}",
            client_type=p.client_type,
            billing_type=p.billing_type,
            status=p.status,
            assigned_doctor_id=p.assigned_doctor_id,
            assigned_doctor_name=assigned_doctor_name,
            chief_complaint=p.chief_complaint,
            bay_or_room=p.bay_or_room,
            triage_level=p.triage_level,
            lab_status=p.lab_status,
            insurer_name=p.insurer_name,
            member_id=p.member_id
        ))
    
    return result

def get_patient_associated_doctors(patient_user_id: int, current_user: User, db: Session):
    """
    Get all doctors associated with a specific patient.
    Returns the assigned doctor and all doctors who have had appointments with the patient.
    
    Args:
        patient_user_id: The user_id of the patient (not profile_id)
    """
    # Get the patient profile by user_id
    profile = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.assigned_doctor)
    ).filter(PatientProfile.user_id == patient_user_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    # Authorization check
    user_role = current_user.role.name
    
    if user_role == "Patient":
        # Patients can only view their own associated doctors
        if profile.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own associated doctors."
            )
    else:
        # For staff/doctors, check hospital access
        user_hospital = get_my_hospital(current_user, db)
        if profile.hospital_id != user_hospital.id and user_role != "Super_Admin":
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this patient's records."
            )
    
    associated_doctors = []
    doctor_ids_seen = set()
    
    # Add assigned doctor first (if exists)
    if profile.assigned_doctor:
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == profile.assigned_doctor_id
        ).options(joinedload(DoctorProfile.department)).first()
        
        if doctor_profile:
            associated_doctors.append(AssociatedDoctorResponse(
                user_id=profile.assigned_doctor.id,
                full_name=f"{profile.assigned_doctor.first_name} {profile.assigned_doctor.last_name}",
                email=profile.assigned_doctor.email,
                specialization=doctor_profile.specialization,
                department_name=doctor_profile.department.name if doctor_profile.department else None,
                profile_picture_url=doctor_profile.profile_picture_url,
                is_assigned_doctor=True,
                relationship_type="assigned"
            ))
            doctor_ids_seen.add(profile.assigned_doctor_id)
    
    # Get all doctors from appointment history
    appointments = db.query(Appointment).filter(
        Appointment.patient_profile_id == profile.id
    ).options(
        joinedload(Appointment.doctor)
    ).all()
    
    # Collect unique doctors from appointments
    for appointment in appointments:
        if appointment.doctor_user_id and appointment.doctor_user_id not in doctor_ids_seen:
            doctor_profile = db.query(DoctorProfile).filter(
                DoctorProfile.user_id == appointment.doctor_user_id
            ).options(joinedload(DoctorProfile.department)).first()
            
            if doctor_profile:
                associated_doctors.append(AssociatedDoctorResponse(
                    user_id=appointment.doctor.id,
                    full_name=f"{appointment.doctor.first_name} {appointment.doctor.last_name}",
                    email=appointment.doctor.email,
                    specialization=doctor_profile.specialization,
                    department_name=doctor_profile.department.name if doctor_profile.department else None,
                    profile_picture_url=doctor_profile.profile_picture_url,
                    is_assigned_doctor=False,
                    relationship_type="appointment_history"
                ))
                doctor_ids_seen.add(appointment.doctor_user_id)
    
    return associated_doctors


#-------------------------------------------------------


