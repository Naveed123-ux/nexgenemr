from fastapi import APIRouter, Depends, Form, UploadFile, File, Query
from sqlalchemy.orm import Session
import json
from typing import List

from db.db import get_db
from services import doctor_service, user_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter()

@router.get("/me", response_model=doctor_service.DoctorProfileResponse, dependencies=[Depends(require_permission("doctors:read:me"))])
def get_my_doctor_details(current_user: User = Depends(get_current_user)):
    """
    Get the complete profile for the currently logged-in doctor.
    """
    return doctor_service.get_my_doctor_profile(current_user)


@router.put("/me/profile-picture")
def update_my_doctor_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    file: UploadFile = File(...)
):
    """
    Update the profile picture for the currently logged-in doctor.
    """
    return user_service.update_profile_picture(current_user, file, db)


@router.post("/", response_model=doctor_service.DoctorResponse, dependencies=[Depends(require_permission("doctors:create"))])
def create_new_doctor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    doctor_details: str = Form(...),
    profile_picture: UploadFile = File(None)
):
    doctor_data_dict = json.loads(doctor_details)
    doctor_data = doctor_service.DoctorCreate(**doctor_data_dict)
    return doctor_service.create_doctor(db, doctor_data, profile_picture, current_user)

@router.get("/", response_model=doctor_service.PaginatedDoctorResponse, dependencies=[Depends(require_permission("doctors:read:all"))])
def get_all_doctors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1)
):
    return doctor_service.get_doctors_in_hospital(current_user, db, page=page, size=4)

@router.get("/{doctor_user_id}", response_model=doctor_service.DoctorResponse, dependencies=[Depends(require_permission("doctors:read:one"))])
def get_single_doctor(
    doctor_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = doctor_service.get_doctor_by_id(doctor_user_id, current_user, db)
    return doctor_service.DoctorResponse.from_orm(profile)

@router.put("/{doctor_user_id}", response_model=doctor_service.DoctorResponse, dependencies=[Depends(require_permission("doctors:update"))])
def update_single_doctor(
    doctor_user_id: int,
    doctor_data: doctor_service.DoctorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = doctor_service.update_doctor(doctor_user_id, doctor_data, current_user, db)
    return doctor_service.DoctorResponse.from_orm(profile)

@router.delete("/{doctor_user_id}", dependencies=[Depends(require_permission("doctors:delete"))])
def delete_single_doctor(
    doctor_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return doctor_service.delete_doctor(doctor_user_id, current_user, db)

@router.post("/{doctor_user_id}/toggle-status", response_model=doctor_service.DoctorResponse, dependencies=[Depends(require_permission("doctors:update"))])
def toggle_doctor_status(
    doctor_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = user_service.toggle_user_activation(doctor_user_id, db)
    # Refresh doctor profile to return
    profile = doctor_service.get_doctor_by_id(doctor_user_id, current_user, db)
    return doctor_service.DoctorResponse(
        user_id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        profile_id=profile.id,
        specialization=profile.specialization,
        department_name=profile.department.name if profile.department else "N/A",
        profile_picture_url=profile.profile_picture_url,
        is_active=user.is_active
    )