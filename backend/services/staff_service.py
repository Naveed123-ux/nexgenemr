import math
from fastapi import Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time
from typing import List, Optional

from db.db import get_db
from models.user_model import User
from models.role_model import Role
from models.staff_profile_model import StaffProfile
from models.doctor_profile_model import DoctorProfile
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.appointment_session_model import AppointmentSession
from models.department_model import Department # <-- ADD THIS IMPORT
from services.user_service import get_password_hash
from services.hospital_service import generate_temporary_password, get_my_hospital
from utils.email_utils import send_welcome_email
from utils.cloudinary_utils import upload_image

class StaffDashboardStats(BaseModel):
    total_doctors: int
    total_patients: int
    appointments_today: int

class StaffCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    job_title: str
    role_name: Optional[str] = "Receptionist"

class StaffMemberForDoctorResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    role: str

    class Config:
        from_attributes = True

class StaffResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    job_title: str
    profile_picture_url: Optional[str]

    class Config:
        from_attributes = True

class PaginatedStaffResponse(BaseModel):
    total: int
    page: int
    size: int
    totalPages: int
    staff: List[StaffResponse]

class StaffProfileResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    job_title: str
    hospital_id: int
    profile_picture_url: Optional[str]

def create_staff(
    db: Session,
    staff_data: StaffCreate,
    profile_picture: UploadFile,
    current_user: User
):
    db.begin_nested()
    try:
        hospital_id = current_user.hospital.id

        all_roles = db.query(Role).all()
        selected_role_name = staff_data.role_name or "Receptionist"
        staff_role = next((role for role in all_roles if role.name == selected_role_name), None)
        if not staff_role:
            raise HTTPException(status_code=500, detail=f"The '{selected_role_name}' role has not been configured.")

        if db.query(User).filter(User.email == staff_data.email).first():
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

        profile_picture_url = upload_image(file=profile_picture, required_format='png', max_size_kb=2048, required_dims=(512, 512))

        temp_password = generate_temporary_password()
        new_user = User(
            email=staff_data.email,
            hashed_password=get_password_hash(temp_password),
            first_name=staff_data.first_name,
            last_name=staff_data.last_name,
            role_id=staff_role.id,
            created_at=str(datetime.utcnow()),
            updated_at=str(datetime.utcnow())
        )
        db.add(new_user)
        db.flush()

        new_staff_profile = StaffProfile(
            user_id=new_user.id,
            hospital_id=hospital_id,
            job_title=staff_data.job_title,
            profile_picture_url=profile_picture_url
        )
        db.add(new_staff_profile)

        send_welcome_email(staff_data.email, temp_password)

        db.commit()
        
        return StaffResponse(
            user_id=new_user.id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            job_title=new_staff_profile.job_title,
            profile_picture_url=new_staff_profile.profile_picture_url
        )

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def get_staff_dashboard_stats(current_user: User, db: Session) -> StaffDashboardStats:
    """
    Retrieves key statistics for the staff dashboard of the user's hospital.
    """
    if current_user.role.name not in ["Receptionist", "Hospital_Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access these statistics."
        )

    hospital_id = get_my_hospital(current_user, db).id

    # Count doctors in the hospital
    total_doctors = db.query(DoctorProfile).join(DoctorProfile.department).filter(Department.hospital_id == hospital_id).count()

    # Count patients in the hospital
    total_patients = db.query(PatientProfile).filter(PatientProfile.hospital_id == hospital_id).count()

    # Count appointments scheduled for today
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)
    appointments_today = db.query(Appointment).join(Appointment.slot).filter(
        AppointmentSession.start_time >= today_start,
        AppointmentSession.start_time <= today_end
    ).join(Appointment.patient).filter(PatientProfile.hospital_id == hospital_id).count()

    return StaffDashboardStats(
        total_doctors=total_doctors,
        total_patients=total_patients,
        appointments_today=appointments_today
    )

def get_all_staff(current_user: User, db: Session, page: int, size: int):
    offset = (page - 1) * size
    hospital_id = current_user.hospital.id
    
    query = db.query(StaffProfile).filter(StaffProfile.hospital_id == hospital_id)
    
    total = query.count()
    profiles = query.options(joinedload(StaffProfile.user)).offset(offset).limit(size).all()
    
    total_pages = math.ceil(total / size) if total > 0 else 0

    staff_list = [
        StaffResponse(
            user_id=p.user.id,
            email=p.user.email,
            first_name=p.user.first_name,
            last_name=p.user.last_name,
            job_title=p.job_title,
            profile_picture_url=p.profile_picture_url
        ) for p in profiles
    ]

    return PaginatedStaffResponse(
        total=total,
        page=page,
        size=size,
        totalPages=total_pages,
        staff=staff_list
    )

def delete_staff(staff_user_id: int, current_user: User, db: Session):
    hospital_id = current_user.hospital.id
    
    profile = db.query(StaffProfile).filter(
        StaffProfile.user_id == staff_user_id,
        StaffProfile.hospital_id == hospital_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Staff member not found in your hospital.")

    user_to_delete = profile.user
    db.delete(profile)
    db.delete(user_to_delete)
    db.commit()
    
    return {"detail": "Staff member deleted successfully."}


def get_my_profile(current_user: User):
    """
    Returns the complete profile for the currently logged-in staff member.
    """
    return StaffProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role.name,
        job_title=current_user.staff_profile.job_title,
        hospital_id=current_user.staff_profile.hospital_id,
        profile_picture_url=current_user.staff_profile.profile_picture_url
    )


def get_staff_for_doctor(current_user: User, db: Session) -> List[StaffMemberForDoctorResponse]:
    """
    Fetches all staff members belonging to the same hospital as the doctor.
    """
    if not current_user.doctor_profile or not current_user.doctor_profile.department:
        raise HTTPException(status_code=403, detail="Doctor profile or department not found.")
        
    hospital_id = current_user.doctor_profile.department.hospital_id

    staff_profiles = db.query(StaffProfile).options(
        joinedload(StaffProfile.user).joinedload(User.role)
    ).filter(StaffProfile.hospital_id == hospital_id).all()

    if not staff_profiles:
        return []

    response = [
        StaffMemberForDoctorResponse(
            user_id=profile.user.id,
            first_name=profile.user.first_name,
            last_name=profile.user.last_name,
            role=profile.user.role.name
        ) for profile in staff_profiles
    ]

    return response