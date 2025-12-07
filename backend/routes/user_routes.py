from fastapi import APIRouter, Depends
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
from utils.dependencies import get_current_user 
from models.user_model import User
from sqlalchemy.orm import Session
from db.db import get_db
from typing import List

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    return login_for_access_token(login_data=login_data, db=db)

@router.get("/me/role", response_model=RoleResponse)
def read_user_role(current_user: User = Depends(get_current_user)):
    return get_user_role(current_user)

@router.post("/", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(user, db)

@router.get("/", response_model=List[UserResponse])
def read_all_users(db: Session = Depends(get_db)):
    return get_users(db)

@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(user_id: int, db: Session = Depends(get_db)):
    return get_user(user_id, db)
