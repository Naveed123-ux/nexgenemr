from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import lab_result_service
from utils.dependencies import require_permission

router = APIRouter(
    prefix="/lab-results",
    tags=["Lab Results"]
)

@router.post("/patient/{patient_user_id}", response_model=lab_result_service.LabResultResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("lab_results:create"))])
def create_new_lab_result(
    patient_user_id: int,
    lab_data: lab_result_service.LabResultCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new lab result for a specific patient.
    """
    return lab_result_service.create_lab_result(patient_user_id, lab_data, db)

@router.get("/patient/{patient_user_id}", response_model=List[lab_result_service.LabResultResponse], dependencies=[Depends(require_permission("lab_results:read"))])
def get_all_patient_lab_results(
    patient_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all lab results for a specific patient.
    """
    return lab_result_service.get_all_lab_results_for_patient(patient_user_id, db)

@router.get("/{lab_result_id}", response_model=lab_result_service.LabResultResponse, dependencies=[Depends(require_permission("lab_results:read"))])
def get_single_lab_result(
    lab_result_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single lab result by its ID.
    """
    return lab_result_service.get_lab_result_by_id(lab_result_id, db)

@router.put("/{lab_result_id}", response_model=lab_result_service.LabResultResponse, dependencies=[Depends(require_permission("lab_results:update"))])
def update_existing_lab_result(
    lab_result_id: int,
    lab_data: lab_result_service.LabResultUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing lab result.
    """
    return lab_result_service.update_lab_result(lab_result_id, lab_data, db)

@router.delete("/{lab_result_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("lab_results:delete"))])
def delete_existing_lab_result(
    lab_result_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a lab result by its ID.
    """
    return lab_result_service.delete_lab_result(lab_result_id, db)