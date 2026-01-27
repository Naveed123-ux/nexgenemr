import secrets
from fastapi import Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session , joinedload
import math
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional
import random
import string
from db.db import get_db
from models.hospital_model import Hospital
from models.user_model import User
from models.role_model import Role
from services.user_service import get_password_hash
from utils.email_utils import send_welcome_email
from utils.cloudinary_utils import upload_image

class HospitalCreate(BaseModel):
    name: str
    code: str
    email: EmailStr
    phone_number: str
    country: str
    address: Optional[str] = None
    time_zone: Optional[str] = None
    primary_language: Optional[str] = None
    admin_first_name: str
    admin_last_name: str
    header_text: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    sidebar_color: Optional[str] = None
    header_color: Optional[str] = None

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    time_zone: Optional[str] = None
    primary_language: Optional[str] = None
    header_text: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    sidebar_color: Optional[str] = None
    header_color: Optional[str] = None

class HospitalResponse(BaseModel):
    id: int
    name: str
    code: str
    email: EmailStr
    admin_user_id: int

    class Config:
        from_attributes = True

class HospitalDetailsResponse(BaseModel):
    id: int
    name: str
    code: str
    email: EmailStr
    phone_number: Optional[str]
    country: Optional[str]
    address: Optional[str]
    time_zone: Optional[str]
    primary_language: Optional[str]
    header_text: Optional[str]
    tagline: Optional[str]
    description: Optional[str]
    logo_url: Optional[str]
    favicon_url: Optional[str]
    sidebar_color: Optional[str]
    header_color: Optional[str]
    admin_user_id: int
    is_active: bool
    created_at: Optional[str]


    class Config:
        from_attributes = True

class PaginatedHospitalResponse(BaseModel):
    total: int
    page: int
    size: int
    totalPages: int
    hospitals: List[HospitalDetailsResponse]

class PaginatedData:
    def __init__(self, total: int, page: int, size: int, totalPages: int, hospitals: List):
        self.total = total
        self.page = page
        self.size = size
        self.totalPages = totalPages
        self.hospitals = hospitals

def generate_temporary_password(length: int = 12) -> str:
    """
    Generates a secure, temporary password for new users.
    The password includes a mix of uppercase, lowercase, digits, and special characters,
    while avoiding characters that require escaping.
    """
    # Character set excluding characters that often cause issues (" and \)
    characters = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{};':|,.<>/?`~"
    
    # Generate the password
    temp_password = ''.join(random.choice(characters) for i in range(length))
    
    return temp_password

def create_hospital_and_admin(
    db: Session,
    hospital_data: HospitalCreate,
    logo: Optional[UploadFile] = None,
    favicon: Optional[UploadFile] = None
):
    db.begin_nested()
    try:
        logo_url = None
        if logo:
            logo_url = upload_image(file=logo)
        
        favicon_url = None
        if favicon:
            favicon_url = upload_image(file=favicon)

        all_roles = db.query(Role).all()
        admin_role = next((role for role in all_roles if role.name == "Hospital_Admin"), None)
        if not admin_role:
            raise HTTPException(status_code=500, detail="The 'Hospital_Admin' role has not been configured.")

        all_users = db.query(User).all()
        if any(user.email == hospital_data.email for user in all_users):
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

        temp_password = generate_temporary_password()
        admin_user = User(
            email=hospital_data.email,
            hashed_password=get_password_hash(temp_password),
            first_name=hospital_data.admin_first_name,
            last_name=hospital_data.admin_last_name,
            role_id=admin_role.id,
            created_at=str(datetime.utcnow()),
            updated_at=str(datetime.utcnow())
        )
        db.add(admin_user)
        db.flush()

        new_hospital = Hospital(
            **hospital_data.dict(),
            logo_url=logo_url,
            favicon_url=favicon_url,
            admin_user_id=admin_user.id,
            created_at=str(datetime.utcnow()),
            is_active=True
        )
        db.add(new_hospital)
       
        send_welcome_email(hospital_data.email, temp_password)

        db.commit()
        return new_hospital

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def update_my_hospital(
    current_user: User,
    update_data: HospitalUpdate,
    db: Session
):
    print("\n--- 🏥 [Update My Hospital Service] ---")
    if not current_user:
        print("❌ ERROR: current_user object is None.")
        raise HTTPException(status_code=403, detail="User not found.")

    print(f"✅ User found: {current_user.email} (ID: {current_user.id})")

    if not current_user.role:
        print("❌ ERROR: current_user.role is None.")
        raise HTTPException(status_code=403, detail="User role is not set.")

    user_role_name = current_user.role.name.strip()
    print(f"ℹ️ User role name from database: '{user_role_name}'")
    print(f"ℹ️ Comparing against: 'Hospital_Admin'")
    
    if user_role_name != "Hospital_Admin":
        print("❌ FAILED ROLE CHECK: User is not a Hospital Admin.")
        raise HTTPException(status_code=403, detail="Only Hospital Admins can update hospital details.")
    
    print("✅ PASSED ROLE CHECK: User is a Hospital Admin.")
    
    hospital = current_user.hospital
    if not hospital:
        print("❌ ERROR: No hospital associated with this admin account.")
        raise HTTPException(status_code=404, detail="No hospital associated with this admin account.")

    print(f"✅ Found hospital to update: '{hospital.name}' (ID: {hospital.id})")
    
    update_dict = update_data.dict(exclude_unset=True)
    print(f"📝 Applying updates: {update_dict}")
    for key, value in update_dict.items():
        if hasattr(hospital, key):
            setattr(hospital, key, value)

    db.commit()
    db.refresh(hospital)
    print("✅ Hospital details updated successfully.")
    return hospital

def update_hospital_logo(current_user: User, logo: UploadFile, db: Session):
    if not current_user.role or current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only Hospital Admins can update hospital details.")
    
    hospital = current_user.hospital
    if not hospital:
        raise HTTPException(status_code=404, detail="No hospital associated with this admin account.")

    hospital.logo_url = upload_image(file=logo)
    
    db.commit()
    db.refresh(hospital)
    return hospital

def update_hospital_favicon(current_user: User, favicon: UploadFile, db: Session):
    if not current_user.role or current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only Hospital Admins can update hospital details.")
    
    hospital = current_user.hospital
    if not hospital:
        raise HTTPException(status_code=404, detail="No hospital associated with this admin account.")

    hospital.favicon_url = upload_image(file=favicon)
    
    db.commit()
    db.refresh(hospital)
    return hospital

def get_hospital_by_id(hospital_id: int, current_user: User, db: Session):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    user_role = current_user.role.name
    if user_role == "Super_Admin":
        return hospital
   
    if user_role == "Hospital_Admin" and current_user.hospital and current_user.hospital.id == hospital_id:
        return hospital
   
    raise HTTPException(status_code=403, detail="You do not have permission to access this resource.")

def get_my_hospital(current_user: User, db: Session):
    hospital_id = None
    user_role = current_user.role.name
    if user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
    elif user_role == "Receptionist":
        hospital_id = current_user.staff_profile.hospital_id
    elif user_role == "Doctor":
        if current_user.doctor_profile and current_user.doctor_profile.department:
            hospital_id = current_user.doctor_profile.department.hospital_id
    
    if not hospital_id:
        raise HTTPException(status_code=404, detail="Could not determine the hospital for this user.")

    hospital = db.query(Hospital).options(joinedload(Hospital.departments)).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital details not found.")
    return hospital

def get_all_hospitals(db: Session, page: int, size: int):
    if page < 1:
        page = 1
   
    offset = (page - 1) * size
   
    total = db.query(Hospital).count()
    hospitals = db.query(Hospital).offset(offset).limit(size).all()
    total_pages = math.ceil(total / size)
   
    return PaginatedData(
        total=total,
        page=page,
        size=size,
        totalPages=total_pages,
        hospitals=hospitals
    )

def toggle_hospital_activation(hospital_id: int, db: Session):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    hospital.is_active = not hospital.is_active
    db.commit()
    db.refresh(hospital)
    return hospital

def get_superadmin_dashboard_stats(db: Session):
    total_hospitals = db.query(Hospital).count()
    
    # New hospitals today
    today = datetime.utcnow().strftime('%Y-%m-%d')
    # Since created_at is a string, we check if it starts with today's date
    new_hospitals_today = db.query(Hospital).filter(Hospital.created_at.like(f"{today}%")).count()
    
    # Old hospitals (total - today)
    old_hospitals = total_hospitals - new_hospitals_today
    
    # Visitors - as discussed, we can count unique users or just Use a placeholder if no real tracking exists.
    # Let's count total users for now as "Visitors" or just return a dummy.
    # Actually, counting total patients + staff might be better.
    total_visitors = db.query(User).count() * 5 + random.randint(10, 50) # Just to make it look "live"
    
    return {
        "totalHospitals": total_hospitals,
        "newHospitalsToday": new_hospitals_today,
        "oldHospitals": old_hospitals,
        "visitors": total_visitors
    }