from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import hospital_request_service
from utils.dependencies import require_permission

router = APIRouter(
    prefix="/hospital-requests",
    tags=["Hospital Requests"]
)

@router.post("/", response_model=hospital_request_service.HospitalRequestResponse)
def submit_hospital_request(
    request_data: hospital_request_service.HospitalRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for a user to submit a request to register a new hospital.
    """
    return hospital_request_service.create_hospital_request(request_data, db)

@router.get("/", response_model=List[hospital_request_service.HospitalRequestResponse])
def get_all_requests(
    db: Session = Depends(get_db)
):
    """
    Endpoint for Super Admins to view all pending hospital registration requests.
    """
    return hospital_request_service.get_all_hospital_requests(db)

@router.put("/{request_id}")
def update_request_status(
    request_id: int,
    status_update: hospital_request_service.HospitalRequestUpdate,
    db: Session = Depends(get_db)
):
    """
    Endpoint for Super Admins to accept or reject a hospital registration request.
    If accepted, it will create the hospital and the admin user.
    """
    return hospital_request_service.update_hospital_request_status(request_id, status_update, db)

@router.delete("/{request_id}")
def delete_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Endpoint for Super Admins to delete a hospital registration request.
    """
    return hospital_request_service.delete_hospital_request(request_id, db)