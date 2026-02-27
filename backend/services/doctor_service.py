import math
from fastapi import Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

from db.db import get_db
from models.user_model import User
from models.role_model import Role
from models.department_model import Department
from models.doctor_profile_model import DoctorProfile
from services.user_service import get_password_hash
from services.hospital_service import generate_temporary_password
from utils.encryption import encrypt_field
from utils.email_utils import send_welcome_email
from utils.cloudinary_utils import upload_image

class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    qualifications: Optional[str] = None
    years_of_experience: Optional[int] = None
    biography: Optional[str] = None
    languages_spoken: Optional[List[str]] = None
    available_for_telehealth: Optional[bool] = None

class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    department_id: int
    specialization: str
    medical_license_number: str
    qualifications: str
    years_of_experience: int
    npi_number: str
    dea_number: str
    available_for_telehealth: bool
    biography: str
    languages_spoken: List[str]

class DoctorUpdate(BaseModel):
    first_name: str
    last_name: str
    department_id: int
    specialization: str
    qualifications: str
    years_of_experience: int
    available_for_telehealth: bool
    biography: str
    languages_spoken: List[str]

class DoctorResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    profile_id: int
    specialization: str
    department_name: str
    profile_picture_url: Optional[str]
    is_active: bool


    class Config:
        from_attributes = True

class PaginatedDoctorResponse(BaseModel):
    total: int
    page: int
    size: int
    totalPages: int
    doctors: List[DoctorResponse]

class DoctorProfileResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    specialization: str
    department_name: str
    medical_license_number: str
    qualifications: str
    years_of_experience: int
    npi_number: str
    dea_number: str
    available_for_telehealth: bool
    biography: str
    languages_spoken: List[str]
    profile_picture_url: Optional[str]
    is_google_connected: bool

def create_doctor(
    db: Session,
    doctor_data: DoctorCreate,
    profile_picture: Optional[UploadFile],
    current_user: User
):
    db.begin_nested()
    try:
        hospital_id = current_user.hospital.id
        all_roles = db.query(Role).all()
        doctor_role = next((role for role in all_roles if role.name == "Doctor"), None)
        if not doctor_role:
            raise HTTPException(status_code=500, detail="The 'Doctor' role has not been configured.")

        department = db.query(Department).filter(
            Department.id == doctor_data.department_id,
            Department.hospital_id == hospital_id
        ).first()
        if not department:
            raise HTTPException(status_code=400, detail="Department not found in your hospital.")

        if db.query(User).filter(User.email == encrypt_field(doctor_data.email)).first():
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

        # Upload profile picture only if provided
        profile_picture_url = None
        if profile_picture:
            profile_picture_url = upload_image(file=profile_picture)
        temp_password = generate_temporary_password()
        new_user = User(
            email=doctor_data.email,
            hashed_password=get_password_hash(temp_password),
            first_name=doctor_data.first_name,
            last_name=doctor_data.last_name,
            role_id=doctor_role.id,
            created_at=str(datetime.utcnow()),
            updated_at=str(datetime.utcnow())
        )
        db.add(new_user)
        db.flush()

        new_doctor_profile = DoctorProfile(
            user_id=new_user.id,
            department_id=doctor_data.department_id,
            specialization=doctor_data.specialization,
            medical_license_number=doctor_data.medical_license_number,
            qualifications=doctor_data.qualifications,
            years_of_experience=doctor_data.years_of_experience,
            npi_number=doctor_data.npi_number,
            dea_number=doctor_data.dea_number,
            available_for_telehealth=doctor_data.available_for_telehealth,
            profile_picture_url=profile_picture_url,
            biography=doctor_data.biography,
            languages_spoken=",".join(doctor_data.languages_spoken)
        )
        db.add(new_doctor_profile)
        send_welcome_email(doctor_data.email, temp_password)
        db.commit()
        
        # Manually construct response to include department name
        return DoctorResponse(
            user_id=new_user.id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            profile_id=new_doctor_profile.id,
            specialization=new_doctor_profile.specialization,
            department_name=department.name,
            profile_picture_url=new_doctor_profile.profile_picture_url,
            is_active=new_user.is_active
        )


    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def get_doctors_in_hospital(current_user: User, db: Session, page: int, size: int):
    offset = (page - 1) * size
    
    base_query = db.query(DoctorProfile).options(
        joinedload(DoctorProfile.user), 
        joinedload(DoctorProfile.department)
    )

    user_role = current_user.role.name
    if user_role == "Super_Admin":
        query = base_query
    elif user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
        query = base_query.join(DoctorProfile.department).filter(Department.hospital_id == hospital_id)
    elif user_role == "Receptionist":
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
        hospital_id = current_user.staff_profile.hospital_id
        query = base_query.join(DoctorProfile.department).filter(Department.hospital_id == hospital_id)
    else:
        return PaginatedDoctorResponse(total=0, page=page, size=size, totalPages=0, doctors=[])

    total = query.count()
    profiles = query.offset(offset).limit(size).all()
    
    total_pages = math.ceil(total / size) if total > 0 else 0

    return PaginatedDoctorResponse(
        total=total,
        page=page,
        size=size,
        totalPages=total_pages,
        doctors=[
            DoctorResponse(
                user_id=p.user.id,
                email=p.user.email,
                first_name=p.user.first_name,
                last_name=p.user.last_name,
                profile_id=p.id,
                specialization=p.specialization,
                department_name=p.department.name if p.department else "N/A",
                profile_picture_url=p.profile_picture_url,
                is_active=p.user.is_active
            ) for p in profiles

        ]
    )

def get_doctor_by_id(doctor_user_id: int, current_user: User, db: Session):
    profile = db.query(DoctorProfile).options(
        joinedload(DoctorProfile.user),
        joinedload(DoctorProfile.department)
    ).filter(DoctorProfile.user_id == doctor_user_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    user_role = current_user.role.name
    if user_role != "Super_Admin":
        # Determine hospital_id based on the current user's role
        if user_role == "Hospital_Admin":
            hospital_id = current_user.hospital.id
        elif user_role == "Receptionist":
            if not current_user.staff_profile:
                raise HTTPException(status_code=403, detail="Staff profile not found for this user.")
            hospital_id = current_user.staff_profile.hospital_id
        else:
            raise HTTPException(status_code=403, detail="You do not have permission to view this doctor.")

        if not profile.department or profile.department.hospital_id != hospital_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this doctor.")
            
    return profile

def update_doctor(doctor_user_id: int, doctor_data: DoctorUpdate, current_user: User, db: Session):
    profile = get_doctor_by_id(doctor_user_id, current_user, db)
    
    profile.user.first_name = doctor_data.first_name
    profile.user.last_name = doctor_data.last_name
    
    # Verify the new department is in the same hospital
    if profile.department_id != doctor_data.department_id:
        new_department = db.query(Department).filter(Department.id == doctor_data.department_id, Department.hospital_id == current_user.hospital.id).first()
        if not new_department:
            raise HTTPException(status_code=400, detail="New department not found in your hospital.")
        profile.department_id = doctor_data.department_id

    profile.specialization = doctor_data.specialization
    profile.qualifications = doctor_data.qualifications
    profile.years_of_experience = doctor_data.years_of_experience
    profile.available_for_telehealth = doctor_data.available_for_telehealth
    profile.biography = doctor_data.biography
    profile.languages_spoken = ",".join(doctor_data.languages_spoken)
    
    db.commit()
    db.refresh(profile)
    return profile

def delete_doctor(doctor_user_id: int, current_user: User, db: Session):
    profile = get_doctor_by_id(doctor_user_id, current_user, db)
    user_to_delete = profile.user

    db.delete(profile)
    db.delete(user_to_delete)
    db.commit()
    return {"detail": "Doctor deleted successfully."}


def get_my_doctor_profile(current_user: User):
    """
    Returns the complete profile for the currently logged-in doctor.
    """
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found for the current user.")

    return DoctorProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        specialization=profile.specialization,
        department_name=profile.department.name if profile.department else "N/A",
        medical_license_number=profile.medical_license_number,
        qualifications=profile.qualifications,
        years_of_experience=profile.years_of_experience,
        npi_number=profile.npi_number,
        dea_number=profile.dea_number,
        available_for_telehealth=profile.available_for_telehealth,
        biography=profile.biography,
        languages_spoken=profile.languages_spoken.split(',') if profile.languages_spoken else [],
        profile_picture_url=profile.profile_picture_url,
        is_google_connected=current_user.google_auth_token is not None
    )

def update_my_doctor_profile(db: Session, current_user: User, data: DoctorProfileUpdate):
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    if data.specialization is not None: profile.specialization = data.specialization
    if data.qualifications is not None: profile.qualifications = data.qualifications
    if data.years_of_experience is not None: profile.years_of_experience = data.years_of_experience
    if data.biography is not None: profile.biography = data.biography
    if data.languages_spoken is not None: profile.languages_spoken = ",".join(data.languages_spoken)
    if data.available_for_telehealth is not None: profile.available_for_telehealth = data.available_for_telehealth
    
    db.commit()
    db.refresh(profile)
    return get_my_doctor_profile(current_user)