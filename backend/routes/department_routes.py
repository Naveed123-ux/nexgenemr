from fastapi import APIRouter, Depends, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from db.db import get_db
from services import department_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter()

@router.post("/", response_model=department_service.DepartmentResponse, dependencies=[Depends(require_permission("departments:create"))])
def create_department(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    details: str = Form(...),
    logo: UploadFile = File(...)
):
    department_data = department_service.DepartmentCreate(**json.loads(details))
    return department_service.create_department(db, department_data, logo, current_user)

@router.get("/", response_model=List[department_service.DepartmentResponse], dependencies=[Depends(require_permission("departments:read:all"))])
def get_all_departments(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return department_service.get_departments(current_user, db)

@router.get("/{department_id}", response_model=department_service.DepartmentResponse, dependencies=[Depends(require_permission("departments:read:one"))])
def get_single_department(
    department_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return department_service.get_department(department_id, current_user, db)

@router.put("/{department_id}", response_model=department_service.DepartmentResponse, dependencies=[Depends(require_permission("departments:update"))])
def update_department(
    department_id: int,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    details: str = Form(...),
    logo: Optional[UploadFile] = File(None)
):
    department_data = department_service.DepartmentUpdate(**json.loads(details))
    return department_service.update_department(db, department_id, department_data, logo, current_user)

@router.delete("/{department_id}", dependencies=[Depends(require_permission("departments:delete"))])
def delete_department(
    department_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return department_service.delete_department(department_id, current_user, db)
