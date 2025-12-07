from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import prescription_service
from utils.dependencies import get_current_user
from models.user_model import User

router = APIRouter(
    prefix="/prescriptions",
    tags=["Prescriptions"]
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_new_prescription(
    prescription_data: prescription_service.PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new electronic prescription for a patient."""
    return prescription_service.create_prescription(db, prescription_data, current_user)

@router.get("/patient/{patient_user_id}", response_model=List[prescription_service.PrescriptionResponse])
def get_patient_prescriptions(
    patient_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all active and past prescriptions for a specific patient by their user ID."""
    return prescription_service.get_prescriptions_for_patient(db, patient_user_id, current_user)

@router.put("/{prescription_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_a_prescription(
    prescription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an active prescription."""
    return prescription_service.cancel_prescription(db, prescription_id, current_user)

@router.delete("/{prescription_id}", status_code=status.HTTP_200_OK)
def delete_a_prescription(
    prescription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a prescription record."""
    return prescription_service.delete_prescription(db, prescription_id, current_user)
