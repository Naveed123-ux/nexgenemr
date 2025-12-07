from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.db import get_db
from services import synopsis_service
from utils.dependencies import require_permission

router = APIRouter(
    prefix="/synopsis",
    tags=["AI Synopsis"]
)

@router.get(
    "/patient/{patient_user_id}", 
    response_model=synopsis_service.SynopsisResponse
)
def get_patient_synopsis(
    patient_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Gathers a patient's complete clinical history and generates an AI-powered
    summary of their progress and status.
    """
    return synopsis_service.generate_patient_synopsis(patient_user_id, db)