from fastapi import APIRouter, Depends, UploadFile
from services.user_service import (
    UserCreate, 
    UserResponse, 
    TokenResponse,
    LoginRequest,
    RoleResponse,
    get_user_role, 
    create_user, 
    get_users, 
    get_user,
    login_for_access_token
)
from models.user_model import User
from utils.dependencies import get_current_user
from sqlalchemy.orm import Session
from db.db import get_db
from typing import List
from pydantic import BaseModel

router = APIRouter()

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login", response_model=TokenResponse)
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    return login_for_access_token(login_data=login_data, db=db)

@router.get("/me/role", response_model=RoleResponse)
def read_user_role(current_user: User = Depends(get_current_user)):
    return get_user_role(current_user)

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(user, db)

@router.get("/", response_model=List[UserResponse])
def read_all_users(db: Session = Depends(get_db)):
    return get_users(db)

@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(user_id: int, db: Session = Depends(get_db)):
    return get_user(user_id, db)

@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    user_data: UserCreate, # Reusing UserCreate for simplicity, though a partial update schema is better
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.user_service import update_user_profile
    return update_user_profile(db, current_user.id, user_data, current_user)

@router.post("/me/picture")
def upload_user_picture(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.user_service import update_profile_picture
    return update_profile_picture(current_user, file, db)

@router.put("/me/change-password")
def change_my_password(
    request_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.user_service import change_password
    return change_password(db, current_user, request_data.old_password, request_data.new_password)
