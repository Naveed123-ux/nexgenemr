from fastapi import Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from db.db import get_db
from models.department_model import Department
from models.user_model import User
from utils.cloudinary_utils import upload_image

class DepartmentCreate(BaseModel):
    name: str
    is_active: bool = True
    no_of_members: int

class DepartmentUpdate(BaseModel):
    name: str
    is_active: bool = True
    no_of_members: int

class DepartmentResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    hospital_id: int
    logo_url: Optional[str]
    no_of_members: int

    class Config:
        from_attributes = True

def create_department(
    db: Session,
    department_data: DepartmentCreate, 
    logo: UploadFile,
    current_user: User
):
    hospital_id = current_user.hospital.id

    departments = db.query(Department).filter(Department.hospital_id == hospital_id).all()
    if any(dept.name.lower() == department_data.name.lower() for dept in departments):
        raise HTTPException(status_code=400, detail=f"Department '{department_data.name}' already exists.")

    logo_url = upload_image(file=logo, required_format='png', max_size_kb=1024, required_dims=(256, 256))

    new_department = Department(
        name=department_data.name,
        is_active=department_data.is_active,
        no_of_members=department_data.no_of_members,
        logo_url=logo_url,
        hospital_id=hospital_id
    )
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    return new_department

def get_departments(current_user: User, db: Session = Depends(get_db)) -> List[DepartmentResponse]:
    hospital_id = current_user.hospital.id
    return db.query(Department).filter(Department.hospital_id == hospital_id).all()

def get_department(department_id: int, current_user: User, db: Session = Depends(get_db)):
    hospital_id = current_user.hospital.id
    department = db.query(Department).filter(Department.id == department_id, Department.hospital_id == hospital_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found or you do not have permission to view it.")
    return department

def update_department(
    db: Session,
    department_id: int, 
    department_data: DepartmentUpdate, 
    logo: Optional[UploadFile],
    current_user: User
):
    department = get_department(department_id, current_user, db)

    if department.name.lower() != department_data.name.lower():
        departments = db.query(Department).filter(Department.hospital_id == current_user.hospital.id).all()
        if any(dept.name.lower() == department_data.name.lower() for dept in departments):
            raise HTTPException(status_code=400, detail=f"Department '{department_data.name}' already exists.")

    department.name = department_data.name
    department.is_active = department_data.is_active
    department.no_of_members = department_data.no_of_members

    if logo:
        department.logo_url = upload_image(file=logo, required_format='png', max_size_kb=1024, required_dims=(256, 256))

    db.commit()
    db.refresh(department)
    return department

def delete_department(department_id: int, current_user: User, db: Session = Depends(get_db)):
    department = get_department(department_id, current_user, db)
    db.delete(department)
    db.commit()
    return {"detail": "Department deleted successfully."}
