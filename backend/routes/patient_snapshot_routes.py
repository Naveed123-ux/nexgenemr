from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.db import get_db
from services import patient_snapshot_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter(
    prefix="/snapshot",
    tags=["Patient Snapshot"]
)


@router.get(
    "/patient/{patient_user_id}",
    response_model=patient_snapshot_service.PatientSnapshotResponse
)
def get_patient_snapshot(
    patient_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a comprehensive snapshot of a patient's medical records.
    
    Returns:
    - **header**: Patient demographics, care team, and medical history
    - **journey**: Chronological timeline of all appointments with vitals and SOAP notes
    
    Access Control:
    - Doctors: Can only access their assigned patients
    - Hospital Admins/Staff: Can access all patients in their hospital
    - Super Admins: Can access any patient
    """
    return patient_snapshot_service.get_patient_snapshot(
        patient_user_id=patient_user_id,
        current_user=current_user,
        db=db
    )