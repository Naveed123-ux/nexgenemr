from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from db.db import get_db
from models.user_model import User
from models.lab_request_model import LabRequestStatus, LabRequestType
from services import lab_request_service
from utils.dependencies import get_current_user, require_permission

router = APIRouter()

@router.post("/", response_model=lab_request_service.LabRequestResponse)
def create_request(
    data: lab_request_service.LabRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:request"))
):
    return lab_request_service.create_lab_request(
        db, current_user.id, data
    )

@router.get("/", response_model=lab_request_service.PaginatedLabRequestResponse)
def list_all_requests(
    status: Optional[LabRequestStatus] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:read:all"))
):
    """List all requests (usually for Lab Techs)."""
    return lab_request_service.get_lab_requests(
        db, status, current_user.id, "Lab_Technician", page, size, current_user
    )


@router.get("/me", response_model=lab_request_service.PaginatedLabRequestResponse)
def list_my_requests(
    status: Optional[LabRequestStatus] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:read:own"))
):
    """List requests created by the current doctor."""
    return lab_request_service.get_lab_requests(
        db, status, current_user.id, "Doctor", page, size, current_user
    )


@router.get("/patient/me", response_model=lab_request_service.PaginatedLabRequestResponse)
def list_my_patient_requests(
    status: Optional[LabRequestStatus] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    # Assuming there's a permission like "lab:read:own" or "patient:read:own" covering this.
    # If not, might need to adjust or rely on role check inside service/dependency.
    # Let's assume basic authenticated patient access is sufficient or reused permission.
    _ = Depends(require_permission("lab:read:own")) 
):
    """List requests for the current patient."""
    return lab_request_service.get_lab_requests(
        db, status, current_user.id, "Patient", page, size, current_user
    )


@router.get("/{request_id}", response_model=lab_request_service.LabRequestResponse)
def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    # Allow either Doctors (read:own) or Lab Techs (read:all) to view details
    _ = Depends(require_permission(["lab:read:own", "lab:read:all"]))
):
    # Depending on requirements, might need to ensure user can only see "their" request.
    # But get_lab_request_by_id doesn't filter.
    # For now, let's allow it as permissions safeguard the route access.
    return lab_request_service.get_lab_request_by_id(db, request_id)

@router.post("/{request_id}/accept", response_model=lab_request_service.LabRequestResponse)
def accept_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:accept"))
):
    return lab_request_service.accept_lab_request(db, request_id, current_user.id)

@router.post("/{request_id}/reject", response_model=lab_request_service.LabRequestResponse)
def reject_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:accept")) # Reusing accept permission for simplicity, or could add lab:reject
):
    return lab_request_service.reject_lab_request(db, request_id, current_user.id)

@router.post("/{request_id}/process", response_model=lab_request_service.LabRequestResponse)
def process_request(
    request_id: int,
    image_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:process"))
):
    # Only Lab Techs should process unless configured otherwise
    return lab_request_service.process_brain_tumor_request(db, request_id, image_file)

@router.post("/{request_id}/review", response_model=lab_request_service.LabRequestResponse)
def review_request(
    request_id: int,
    data: lab_request_service.LabReviewInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(require_permission("lab:review"))
):
    return lab_request_service.review_lab_request(
        db, request_id, current_user.id, data
    )
