from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import patient_list_service
from utils.dependencies import get_current_user
from models.user_model import User

router = APIRouter(
    prefix="/patient-list",
    tags=["Patient List"]
)

@router.get("/doctor", response_model=List[patient_list_service.PatientListResponse])
def get_doctor_patient_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of patients for the currently logged-in doctor.
    """
    return patient_list_service.get_patient_list(current_user=current_user, db=db)

@router.get("/staff", response_model=List[patient_list_service.PatientListResponse])
def get_staff_patient_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of all patients in the hospital.
    - Doctors see all patients in their hospital
    - Receptionists and Hospital Admins see all patients in their hospital
    """
    return patient_list_service.get_all_patients_for_staff(current_user=current_user, db=db)


@router.get("/list", response_model=List[patient_list_service.PatientListResponse])
def get_all_patients_for_hospital(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of all patients and their important data for authorized hospital staff.
    - Doctors see patients they have appointments with OR patients assigned to them
    - Receptionists and Hospital Admins see all patients in their hospital
    """
    return patient_list_service.get_patient_list_for_hospital(current_user=current_user, db=db)
