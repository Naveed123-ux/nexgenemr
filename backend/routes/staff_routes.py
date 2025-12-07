from fastapi import APIRouter, Depends, Form, UploadFile, File, Query
from sqlalchemy.orm import Session
import json
from typing import List
from db.db import get_db
from services import staff_service, user_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter()

@router.get("/me", response_model=staff_service.StaffProfileResponse, dependencies=[Depends(require_permission("staff:read:me"))])
def get_my_staff_profile(current_user: User = Depends(get_current_user)):
    return staff_service.get_my_profile(current_user)


@router.put("/me/profile-picture")
def update_my_staff_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    file: UploadFile = File(...)
):
    """
    Update the profile picture for the currently logged-in staff member.
    """
    return user_service.update_profile_picture(current_user, file, db)


@router.get("/for-doctor", response_model=List[staff_service.StaffMemberForDoctorResponse], dependencies=[Depends(require_permission("staff:read:doctor"))])
def get_staff_for_current_doctor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all staff members in the same hospital as the currently logged-in doctor.
    """
    return staff_service.get_staff_for_doctor(current_user, db)


@router.post("/", response_model=staff_service.StaffResponse, dependencies=[Depends(require_permission("staff:create"))])
def create_new_staff_member(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    details: str = Form(...),
    profile_picture: UploadFile = File(...)
):
    staff_data_dict = json.loads(details)
    staff_data = staff_service.StaffCreate(**staff_data_dict)
    return staff_service.create_staff(db, staff_data, profile_picture, current_user)

@router.get("/", response_model=staff_service.PaginatedStaffResponse, dependencies=[Depends(require_permission("staff:read:all"))])
def get_all_staff_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1)
):
    return staff_service.get_all_staff(current_user, db, page=page, size=10)

@router.delete("/{staff_user_id}", dependencies=[Depends(require_permission("staff:delete"))])
def delete_staff_member(
    staff_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return staff_service.delete_staff(staff_user_id, current_user, db)


@router.get("/dashboard-stats", response_model=staff_service.StaffDashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves key statistics for the staff dashboard, such as total doctors,
    patients, and appointments scheduled for the current day.
    """
    return staff_service.get_staff_dashboard_stats(current_user, db)