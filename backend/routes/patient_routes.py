from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from fastapi import Query
from db.db import get_db
from services import patient_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User
from services import prescription_service
router = APIRouter()

@router.post("/", response_model=patient_service.PatientResponse, dependencies=[Depends(require_permission("patients:create"))])
def create_new_patient(
    patient_data: patient_service.PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return patient_service.create_patient(db, patient_data, current_user)

@router.get("/", response_model=List[patient_service.PatientResponse], dependencies=[Depends(require_permission("patients:read:all"))])
def read_all_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return patient_service.get_all_patients(current_user, db)


@router.get("/search")
def search_patients_route(
    q: str = Query("", description="Search by name, email or user_id"),
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return patient_service.search_patients(current_user, db, q, page, limit)


@router.get("/{patient_profile_id}", response_model=patient_service.PatientDetailResponse, dependencies=[Depends(require_permission("patients:read:one"))])
def read_patient_by_id(
    patient_profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the full, detailed profile for a single patient by their profile ID.
    """
    return patient_service.get_patient_by_id(patient_profile_id, current_user, db)


@router.get("/{patient_profile_id}/prescriptions", response_model=List[prescription_service.PrescriptionResponse])
def get_prescriptions_for_a_patient(
    patient_profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all active and past prescriptions for a specific patient profile ID.
    Accessible by Doctors, Receptionists, and Hospital Admins within the same hospital.
    """
    return prescription_service.get_prescriptions_for_patient(db, patient_profile_id, current_user)

@router.get("/hospital/all", response_model=List[patient_service.HospitalPatientResponse])
def get_hospital_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hospital Admin endpoint to view all patients in their hospital.
    Returns a comprehensive list of all patients registered under the hospital
    with enhanced administrative and clinical information.
    
    Access: Hospital Admin, Receptionist, Staff
    - Hospital Admin: Can view all patients in their hospital
    - Receptionist/Staff: Can view all patients in their assigned hospital
    - Doctor: Can only view their assigned patients (filtered automatically)
    
    Returns additional fields for administrative purposes:
    - Client type and billing information
    - Clinical status (triage level, bay/room, lab status)
    - Assigned doctor information
    - Insurance details
    """
    return patient_service.get_hospital_patients_detailed(current_user, db)

@router.get("/{patient_user_id}/doctors", response_model=List[patient_service.AssociatedDoctorResponse])
def get_patient_associated_doctors(
    patient_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all doctors associated with a specific patient.
    
    Returns:
    - The assigned doctor (if any)
    - All doctors who have had appointments with this patient
    
    Access Control:
    - Patients: Can view their own associated doctors
    - Doctors: Can view associated doctors for patients in their hospital
    - Hospital Admin/Staff: Can view associated doctors for any patient in their hospital
    
    Note: Uses patient_user_id (not profile_id) for consistency with other snapshot endpoints
    """
    return patient_service.get_patient_associated_doctors(patient_user_id, current_user, db)
# 🔼 --- NEW ENDPOINT END --- 🔼
