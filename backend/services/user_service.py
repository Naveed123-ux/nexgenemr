from fastapi import Depends, HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from models.user_model import User
from models.role_model import Role
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from db.db import get_db
from datetime import datetime
from utils.encryption import encrypt_field
from utils.jwt import create_access_token, create_refresh_token
from passlib.context import CryptContext
from utils.cloudinary_utils import upload_image

# Setup for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role_id: int
    is_active: bool = True

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    role_id: int
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    email: EmailStr
    role: str
    first_name: str
    last_name: str

class RoleResponse(BaseModel):
    role: str

def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    users = db.query(User).all()
    for user in users:
        if user.email == email:
            if verify_password(password, user.hashed_password):
                return user
    return None

def login_for_access_token(login_data: LoginRequest, db: Session):
    user = authenticate_user(login_data.email, login_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently deactivated. Please contact the administrator."
        )
    
    # --- CHECK HOSPITAL STATUS ---

    if user.role.name != "Super_Admin":
        hospital = None
        if user.hospital:
            hospital = user.hospital
        elif user.staff_profile:
            hospital = user.staff_profile.hospital
        elif user.doctor_profile and user.doctor_profile.department:
            hospital = user.doctor_profile.department.hospital
        elif user.patient_profile:
            hospital = user.patient_profile.hospital
            
        if hospital and not hospital.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your hospital is currently inactive. Please contact the administrator."
            )
    # -----------------------------

    
    token_data = {"sub": user.email, "role": user.role.name}

    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        role=user.role.name,
        first_name=user.first_name,
        last_name=user.last_name
    )

def create_user(user: UserCreate, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role with id {user.role_id} not found")
    if db.query(User).filter(User.email == encrypt_field(user.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    now_str = str(datetime.utcnow())
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        is_active=user.is_active,
        created_at=now_str,
        updated_at=now_str
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session = Depends(get_db)) -> List[UserResponse]:
    return db.query(User).all()

def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_user_role(current_user: User) -> RoleResponse:
    if not current_user.role:
        raise HTTPException(status_code=404, detail="User role not found.")
    return RoleResponse(role=current_user.role.name)

# --- START OF CHANGES ---
def update_profile_picture(current_user: User, file: UploadFile, db: Session):
    """
    Updates the profile picture for the currently logged-in user.
    Handles both Doctor and Staff profiles.
    """
    profile = None
    if current_user.role.name == "Doctor":
        profile = current_user.doctor_profile
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
    elif current_user.role.name in ["Receptionist", "Hospital_Admin", "Lab_Technician"]:
        profile = current_user.staff_profile
        if not profile:
            raise HTTPException(status_code=404, detail="Staff profile not found.")
    elif current_user.role.name == "Patient":
        profile = current_user.patient_profile
        if not profile:
             raise HTTPException(status_code=404, detail="Patient profile not found.")
    else:
        raise HTTPException(status_code=400, detail="This user role does not have a profile picture.")

    # Upload the new image and get the secure URL
    image_url = upload_image(file=file)
    
    # Update the profile picture URL and commit to the database
    profile.profile_picture_url = image_url
    db.commit()
    db.refresh(profile)
    
    return {"profile_picture_url": image_url}
# --- END OF CHANGES ---

def toggle_user_activation(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return user

def update_user_profile(db: Session, user_id: int, user_data: UserCreate, current_user: User):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.first_name = user_data.first_name
    user.last_name = user_data.last_name
    
    # We don't update email or role here for security, only name
    
    user.updated_at = str(datetime.utcnow())
    db.commit()
    db.refresh(user)
    return user

def change_password(db: Session, current_user: User, old_password: str, new_password: str):
    """
    Verifies old password and updates it with the new one.
    """
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = get_password_hash(new_password)
    current_user.updated_at = str(datetime.utcnow())
    db.commit()
    return {"detail": "Password updated successfully"}