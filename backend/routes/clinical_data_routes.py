from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import clinical_data_service
from utils.dependencies import require_permission
from utils.dependencies import get_current_user
from models.user_model import User

router = APIRouter(
    prefix="/clinical-data",
    tags=["Clinical Data"]
)

@router.post("/history/patient/{patient_user_id}", response_model=clinical_data_service.MedicalHistoryResponse)
def create_or_update_history(
    patient_user_id: int,
    history_data: clinical_data_service.MedicalHistoryCreate,
    db: Session = Depends(get_db)
):
    """Create or update a patient's core medical history using their user ID."""
    return clinical_data_service.create_or_update_medical_history(patient_user_id, history_data, db)

@router.get("/history/patient/{patient_user_id}", response_model=clinical_data_service.MedicalHistoryResponse)
def get_history(
    patient_user_id: int,
    db: Session = Depends(get_db)
):
    """Get a patient's core medical history using their user ID."""
    return clinical_data_service.get_medical_history(patient_user_id, db)


@router.post("/vitals/patient/{patient_user_id}/appointment/{appointment_id}", response_model=clinical_data_service.VitalsResponse)
def add_vitals(
    patient_user_id: int,
    appointment_id: int,
    vitals_data: clinical_data_service.VitalsCreate,
    db: Session = Depends(get_db)
):
    """
    Add a set of vitals to a specific appointment after verifying it
    belongs to the correct patient.
    """
    return clinical_data_service.add_vitals_for_appointment(patient_user_id, appointment_id, vitals_data, db)


@router.get("/vitals/patient/{patient_user_id}", response_model=List[clinical_data_service.PatientVitalsHistoryResponse])
def get_patient_vitals_history(
    patient_user_id: int,
    db: Session = Depends(get_db)
):
    """Get all historical vitals records for a specific patient by their user ID."""
    return clinical_data_service.get_all_vitals_for_patient(patient_user_id, db)


@router.put("/vitals/{vitals_id}", response_model=clinical_data_service.VitalsResponse)
def update_vitals_route(
    vitals_id: int,
    vitals_data: clinical_data_service.VitalsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing vitals record."""
    return clinical_data_service.update_vitals(vitals_id, vitals_data, db, current_user)

@router.delete("/vitals/{vitals_id}", status_code=200)
def delete_vitals_route(
    vitals_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a vitals record."""
    return clinical_data_service.delete_vitals(vitals_id, db, current_user)