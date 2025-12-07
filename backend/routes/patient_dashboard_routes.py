from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.db import get_db
from models.user_model import User
# Import the base dependency function
from utils.dependencies import get_current_user 
from services.patient_dashboard_service import get_patient_dashboard, PatientDashboardResponse

router = APIRouter(
    prefix="/patient", # Changed from /patients to /patient
    tags=["Patient Dashboard"]
)

@router.get("/me", response_model=PatientDashboardResponse)
def read_patient_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    """
    Get a comprehensive dashboard of the currently logged-in patient's health information,
    including upcoming appointments, recent vitals, active medications, and recent lab results.
    """
    # Manually check if the user is active, replicating the logic from the previous dependency
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return get_patient_dashboard(db=db, current_user=current_user)
