from fastapi import APIRouter, Depends, Form, UploadFile, File, Query
from sqlalchemy.orm import Session
import json
from typing import List, Optional

from db.db import get_db
from services.hospital_service import (
    HospitalCreate, 
    HospitalResponse, 
    HospitalDetailsResponse,
    PaginatedHospitalResponse,
    create_hospital_and_admin,
    get_hospital_by_id,
    get_my_hospital,
    get_all_hospitals,
    HospitalUpdate,
    update_my_hospital,
    update_hospital_logo,
    update_hospital_favicon
)
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter()

@router.get("/", response_model=PaginatedHospitalResponse, dependencies=[Depends(require_permission("hospitals:read:all"))])
def read_all_hospitals(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number to fetch")
):
    paginated_result = get_all_hospitals(db=db, page=page, size=10)
    hospitals_as_pydantic = [HospitalDetailsResponse.from_orm(h) for h in paginated_result.hospitals]
    return PaginatedHospitalResponse(
        total=paginated_result.total,
        page=paginated_result.page,
        size=paginated_result.size,
        totalPages=paginated_result.totalPages,
        hospitals=hospitals_as_pydantic
    )

@router.post("/", response_model=HospitalResponse, dependencies=[Depends(require_permission("hospitals:create"))])
def create_hospital(
    db: Session = Depends(get_db),
    basic_info: str = Form(...),
    branding_info: str = Form(...),
    logo: UploadFile = File(...),
    favicon: UploadFile = File(...)
):
    basic_data = json.loads(basic_info)
    branding_data = json.loads(branding_info)
    combined_data = {**basic_data, **branding_data}
    hospital_data = HospitalCreate(**combined_data)
    return create_hospital_and_admin(db=db, hospital_data=hospital_data, logo=logo, favicon=favicon)

@router.get("/me", response_model=HospitalDetailsResponse, dependencies=[Depends(require_permission("hospitals:read:me"))])
def get_my_hospital_details(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_my_hospital(current_user, db)

@router.put("/me", response_model=HospitalDetailsResponse)
def update_my_hospital_details(
    update_data: HospitalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the text-based details for the currently logged-in hospital admin's hospital.
    """
    return update_my_hospital(
        current_user=current_user,
        update_data=update_data,
        db=db
    )

@router.post("/me/logo", response_model=HospitalDetailsResponse)
def upload_hospital_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    logo: UploadFile = File(...)
):
    """
    Update the logo for the currently logged-in hospital admin's hospital.
    """
    return update_hospital_logo(current_user=current_user, logo=logo, db=db)

@router.post("/me/favicon", response_model=HospitalDetailsResponse)
def upload_hospital_favicon(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    favicon: UploadFile = File(...)
):
    """
    Update the favicon for the currently logged-in hospital admin's hospital.
    """
    return update_hospital_favicon(current_user=current_user, favicon=favicon, db=db)

@router.get("/dashboard/stats", dependencies=[Depends(require_permission("hospitals:read:all"))])
def get_dashboard_stats_route(db: Session = Depends(get_db)):
    from services.hospital_service import get_superadmin_dashboard_stats
    return get_superadmin_dashboard_stats(db)

@router.post("/{hospital_id}/toggle-status", response_model=HospitalDetailsResponse, dependencies=[Depends(require_permission("hospitals:update"))])
def toggle_hospital_status(
    hospital_id: int,
    db: Session = Depends(get_db)
):
    from services.hospital_service import toggle_hospital_activation
    return toggle_hospital_activation(hospital_id, db)

@router.get("/{hospital_id}", response_model=HospitalDetailsResponse, dependencies=[Depends(require_permission("hospitals:read:one"))])
def get_single_hospital(
    hospital_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_hospital_by_id(hospital_id, current_user, db)