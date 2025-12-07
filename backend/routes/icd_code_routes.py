from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import icd_code_service
from utils.dependencies import require_permission

router = APIRouter(
    prefix="/icd-codes",
    tags=["ICD Codes"]
)

@router.get("/search", response_model=List[icd_code_service.ICDCodeResponse])
def search_for_icd_codes(
    query: str,
    db: Session = Depends(get_db)
):
    """
    Search for ICD-10 codes by code or description.
    """
    return icd_code_service.search_icd_codes(query, db)

@router.post("/assign/{appointment_id}")
def assign_codes_to_appointment(
    appointment_id: int,
    code_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    Assign a list of ICD codes to an appointment. This will overwrite existing codes.
    """
    return icd_code_service.assign_icd_codes_to_appointment(appointment_id, code_ids, db)

@router.get("/appointment/{appointment_id}", response_model=List[icd_code_service.ICDCodeResponse])
def get_codes_for_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all ICD codes assigned to a specific appointment.
    """
    return icd_code_service.get_icd_codes_for_appointment(appointment_id, db)