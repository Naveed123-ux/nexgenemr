from fastapi import APIRouter, Depends, Query, status, HTTPException 

from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date, time
from pydantic import BaseModel

from db.db import get_db
from services import appointment_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User
from models.appointment_session_model import AppointmentSession
from services.appointment_service import AppointmentResponse, PaginatedAppointmentResponse
from schemas.appointment_slot_schema import SlotResponse


class SessionResponse(BaseModel):
    id: int
    name: str
    session_type: str
    start_time: datetime
    end_time: datetime
    status: str
    is_recurring: bool = False
    recurrence_group_id: Optional[str] = None

    class Config:
        from_attributes = True

router = APIRouter()

@router.post("/generate-slots/{doctor_id}")
def generate_slots_for_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """
    Endpoint for a Hospital Admin to generate appointment slots
    based on a doctor's saved availability template.
    """
    return appointment_service.generate_appointment_sessions(doctor_id, db)

@router.get("/available-slots/{doctor_id}", response_model=List[SlotResponse])
def get_doctor_available_slots(
    doctor_id: int, 
    start_date: date = Query(..., description="The date to check for availability, in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """
    Get all available appointment slots for a specific doctor on a given date.
    Returns individual bookable slots, not sessions.
    """
    return appointment_service.get_available_slots(doctor_id, start_date, db)

@router.post("/", response_model=appointment_service.AppointmentResponse)
def book_appointment(
    appointment_data: appointment_service.AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Book a new appointment for a patient in an available slot.
    Accessible by authorized staff (e.g., Receptionist).
    """
    return appointment_service.create_appointment(db, appointment_data, current_user)


@router.get("/", response_model=appointment_service.PaginatedAppointmentResponse)
def get_appointments_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    target_date: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD), defaults to today"),
    query: Optional[str] = Query(None, description="Search by patient or doctor name")
):
    """
    Get a paginated list of booked appointments.
    - Hospital Admins/Receptionists see all appointments for their hospital.
    - Doctors see only appointments assigned to them.
    """
    if target_date is None:
        target_date = date.today()
        
    return appointment_service.get_appointments(
        db=db,
        current_user=current_user,
        page=page,
        size=10, 
        target_date=target_date,
        search_query=query
    )



@router.get("/doctor/week-appointments")
def get_doctor_weekly_appointments(
    start_date: date = Query(..., description="Any date within the week (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all appointments for the logged-in doctor grouped by full week (Mon–Sun).
    """
    return appointment_service.get_doctor_weekly_appointments(
        db=db,
        current_user=current_user,
        start_date=start_date
    )


@router.get("/doctor/upcoming", response_model=List[AppointmentResponse])
def get_upcoming_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all upcoming appointments for the currently logged-in doctor.
    """
    return appointment_service.get_upcoming_appointments_for_doctor(db, current_user)


@router.delete("/appointment/{appointment_id}", status_code=status.HTTP_200_OK)
def cancel_an_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel and permanently delete an appointment by its ID. This will free up the time slot.
    """
    return appointment_service.cancel_appointment(appointment_id, current_user, db)

@router.put("/appointment/{appointment_id}/reschedule", status_code=status.HTTP_200_OK)
def reschedule_an_appointment(
    appointment_id: int,
    reschedule_data: appointment_service.RescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reschedule an appointment to a new, available appointment slot.
    Provide the new_appointment_slot_id in the request body.
    """
    return appointment_service.reschedule_appointment(appointment_id, reschedule_data, current_user, db)


@router.put("/appointment/{appointment_id}/results", response_model=AppointmentResponse)
def update_appointment_results(
    appointment_id: int,
    results_data: appointment_service.UpdateAppointmentResultsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the results for a specific appointment.
    """
    return appointment_service.update_appointment_results(appointment_id, results_data, current_user, db)


@router.get("/appointment/doctor/all", response_model=List[AppointmentResponse])
def get_all_my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a complete list of all past, present, and future appointments for the
    currently logged-in doctor.
    """
    return appointment_service.get_upcoming_appointments_for_doctor(db, current_user)


@router.get("/me/available-slots", response_model=List[SlotResponse])
def get_my_available_slots_route(
    start_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all available appointment slots for the currently logged-in doctor for a specific date.
    Returns individual bookable slots, not sessions.
    """
    return appointment_service.get_my_available_slots(current_user, start_date, db)

@router.get("/me/all-available-slots", response_model=List[SlotResponse])
def get_all_my_available_slots_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all upcoming available appointment slots for the currently logged-in doctor.
    Returns individual bookable slots, not sessions.
    """
    return appointment_service.get_all_my_available_slots(current_user, db)


# ==================== Slot Management Endpoints ====================

@router.post("/slot/{slot_id}/block", response_model=SlotResponse)
def block_appointment_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Block a slot so it cannot be booked. Doctor only.
    """
    return appointment_service.block_slot(slot_id, current_user, db)


@router.post("/slot/{slot_id}/unblock", response_model=SlotResponse)
def unblock_appointment_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unblock a previously blocked slot. Doctor only.
    """
    return appointment_service.unblock_slot(slot_id, current_user, db)


@router.get("/slot/{slot_id}", response_model=SlotResponse)
def get_slot_details(
    slot_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific slot.
    """
    slot = appointment_service.get_slot_by_id(slot_id, db)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


# ==================== Patient Appointment Endpoints ====================

@router.get("/patient/{patient_profile_id}/appointments", response_model=List[AppointmentResponse])
def get_patient_appointment_list(
    patient_profile_id: int,
    include_past: bool = Query(False, description="Include past appointments"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all appointments for a specific patient.
    """
    return appointment_service.get_patient_appointments(patient_profile_id, db, include_past)


@router.get("/appointment/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_details(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific appointment.
    """
    appointment = appointment_service.get_appointment_by_id(appointment_id, db)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment_service.build_appointment_response(appointment)


# ==================== Statistics Endpoints ====================

@router.get("/doctor/{doctor_id}/statistics")
def get_doctor_appointment_statistics(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get appointment statistics for a doctor.
    """
    return appointment_service.get_appointment_statistics(doctor_id, db)


@router.get("/doctor/me/statistics")
def get_my_appointment_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get appointment statistics for the currently logged-in doctor.
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint")
    return appointment_service.get_appointment_statistics(current_user.id, db)


# ==================== ICD Code Management Endpoints ====================

from services import appointment_icd_service
from schemas.appointment_icd_schema import (
    AppointmentICDCodeResponse,
    AddICDCodeRequest,
    RemoveICDCodeRequest,
    UpdateAppointmentICDCodesRequest
)

@router.get("/appointment/{appointment_id}/icd-codes", response_model=List[AppointmentICDCodeResponse])
def get_appointment_icd_codes(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all ICD codes associated with a specific appointment.
    Accessible by the assigned doctor or hospital staff.
    """
    return appointment_icd_service.get_appointment_icd_codes(appointment_id, current_user, db)


@router.post("/appointment/{appointment_id}/icd-codes", response_model=List[AppointmentICDCodeResponse])
def add_icd_codes_to_appointment(
    appointment_id: int,
    request: AddICDCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add one or more ICD codes to an appointment.
    Duplicates are automatically ignored.
    Accessible by the assigned doctor or hospital staff.
    """
    return appointment_icd_service.add_icd_codes_to_appointment(appointment_id, request, current_user, db)


@router.delete("/appointment/{appointment_id}/icd-codes", response_model=List[AppointmentICDCodeResponse])
def remove_icd_code_from_appointment(
    appointment_id: int,
    request: RemoveICDCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a specific ICD code from an appointment.
    Accessible by the assigned doctor or hospital staff.
    """
    return appointment_icd_service.remove_icd_code_from_appointment(appointment_id, request, current_user, db)


@router.put("/appointment/{appointment_id}/icd-codes", response_model=List[AppointmentICDCodeResponse])
def update_appointment_icd_codes(
    appointment_id: int,
    request: UpdateAppointmentICDCodesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Replace all ICD codes for an appointment with a new set.
    This removes all existing codes and adds the new ones.
    Accessible by the assigned doctor or hospital staff.
    """
    return appointment_icd_service.update_appointment_icd_codes(appointment_id, request, current_user, db)


# ==================== Debug Endpoint (TEMPORARY) ====================

@router.get("/debug/auth")
def debug_auth(current_user: User = Depends(get_current_user)):
    """Debug endpoint to check authentication - REMOVE IN PRODUCTION"""
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "role_id": current_user.role_id,
        "role_name": current_user.role.name if current_user.role else None,
        "has_doctor_profile": current_user.doctor_profile is not None,
        "role_object": str(current_user.role)
    }


# ==================== Appointment Swap Endpoint ====================

@router.post("/swap", status_code=status.HTTP_200_OK)
def swap_two_appointments(
    swap_data: appointment_service.SwapAppointmentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Swap the time slots of two appointments.
    
    This endpoint allows a doctor to exchange the appointment times of two patients.
    Both appointments must belong to the same doctor.
    
    The system will:
    - Validate both appointments exist and belong to the requesting doctor
    - Swap their time slots
    - Update Google Meet links for telehealth appointments
    - Send notification emails to both patients
    
    Only accessible by doctors.
    """
    return appointment_service.swap_appointments(swap_data, current_user, db)


# ==================== Doctor Appointments for Hospital Admin ====================

@router.get("/doctor/{doctor_id}/appointments", response_model=List[AppointmentResponse])
def get_doctor_appointments_by_admin(
    doctor_id: int,
    target_date: Optional[date] = Query(None, description="Date to get appointments for (YYYY-MM-DD). If not provided, returns all upcoming appointments."),
    include_past: bool = Query(False, description="Include past appointments (only used when target_date is not provided)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get appointments for a specific doctor.
    
    This endpoint allows Hospital Admins to view appointments for any doctor
    in their hospital. This is useful for managing schedules and reassigning
    appointments.
    
    Only accessible by Hospital Admins and Receptionists.
    
    Query Parameters:
    - target_date (optional): The date to get appointments for (YYYY-MM-DD format)
      * If provided: Returns appointments for that specific date
      * If not provided: Returns all upcoming appointments (or all if include_past=true)
    - include_past (optional): Include past appointments (default: false)
      * Only used when target_date is not provided
    
    Examples:
    - GET /appointments/doctor/5/appointments?target_date=2025-11-11
      Returns appointments for doctor 5 on Nov 11, 2025
    
    - GET /appointments/doctor/5/appointments
      Returns all upcoming appointments for doctor 5
    
    - GET /appointments/doctor/5/appointments?include_past=true
      Returns all appointments (past and future) for doctor 5
    
    Returns:
    - List of appointments for the specified doctor
    """
    # Authorization check
    if current_user.role.name not in ["Hospital_Admin", "Receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Hospital Admins and Receptionists can view doctor appointments"
        )
    
    # Verify the doctor exists and belongs to the same hospital
    from models.doctor_profile_model import DoctorProfile
    from sqlalchemy.orm import joinedload
    
    doctor_profile = db.query(DoctorProfile).options(
        joinedload(DoctorProfile.department)
    ).filter(
        DoctorProfile.user_id == doctor_id
    ).first()
    
    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found"
        )
    
    if not doctor_profile.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor is not assigned to a department"
        )
    
    # Check if doctor belongs to the same hospital
    user_hospital_id = None
    if current_user.role.name == "Hospital_Admin":
        user_hospital_id = current_user.hospital.id
    elif current_user.role.name == "Receptionist":
        user_hospital_id = current_user.staff_profile.hospital_id
    
    if doctor_profile.department.hospital_id != user_hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view appointments for doctors in your hospital"
        )
    
    # Return appointments based on whether date is provided
    if target_date:
        # Get appointments for specific date
        return appointment_service.get_doctor_appointments_for_date(
            doctor_id=doctor_id,
            target_date=target_date,
            db=db
        )
    else:
        # Get all appointments (upcoming or all)
        return appointment_service.get_all_doctor_appointments(
            doctor_id=doctor_id,
            db=db,
            include_past=include_past
        )


@router.get("/admin/doctor/{doctor_id}/appointments", response_model=List[AppointmentResponse])
def get_doctor_appointments_by_admin(
    doctor_id: int,
    include_past: bool = Query(False, description="Include past appointments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hospital Admin endpoint to get all appointments for a specific doctor.
    
    Returns complete appointment details including:
    - Patient information (name, ID)
    - Appointment date and time
    - Reason for visit
    - Status (Confirmed, Completed, Cancelled, etc.)
    - Telehealth/In-person indicator
    - Google Meet link (if telehealth)
    - ICD codes (if any)
    - Results (if completed)
    
    Query Parameters:
    - include_past: Set to true to include past appointments (default: false, only upcoming)
    
    Authorization: Hospital Admin only
    
    Examples:
    - GET /appointments/admin/doctor/5/appointments
      Returns upcoming appointments for doctor 5
    
    - GET /appointments/admin/doctor/5/appointments?include_past=true
      Returns all appointments (past and future) for doctor 5
    """
    # Authorization: Only Hospital Admin
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Hospital Admins can access this endpoint"
        )
    
    # Verify the doctor exists and belongs to the same hospital
    from models.doctor_profile_model import DoctorProfile
    from sqlalchemy.orm import joinedload
    
    doctor_profile = db.query(DoctorProfile).options(
        joinedload(DoctorProfile.department)
    ).filter(
        DoctorProfile.user_id == doctor_id
    ).first()
    
    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found"
        )
    
    if not doctor_profile.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor is not assigned to a department"
        )
    
    # Verify doctor belongs to admin's hospital
    admin_hospital_id = current_user.hospital.id
    
    if doctor_profile.department.hospital_id != admin_hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view appointments for doctors in your hospital"
        )
    
    # Get all appointments for the doctor
    return appointment_service.get_all_doctor_appointments(
        doctor_id=doctor_id,
        db=db,
        include_past=include_past
    )


# ==================== Doctor Reassignment Endpoint ====================

@router.put("/appointment/{appointment_id}/reassign-doctor", status_code=status.HTTP_200_OK)
def reassign_appointment_doctor(
    appointment_id: int,
    reassign_data: appointment_service.ReassignDoctorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reassign an appointment to a different doctor.
    
    This endpoint allows a Hospital Admin to change the assigned doctor for an appointment.
    The new doctor must belong to the same hospital as the patient.
    
    The system will:
    - Validate the appointment exists
    - Validate the new doctor exists and belongs to the same hospital
    - Update the appointment's assigned doctor
    - Regenerate Google Meet link for telehealth appointments
    - Send notification emails to:
      * Patient (informing them of the doctor change)
      * Previous doctor (notifying them the appointment was removed)
      * New doctor (notifying them of the new appointment)
    
    Only accessible by Hospital Admins.
    
    Request Body:
    - new_doctor_user_id: ID of the doctor to reassign the appointment to
    - reason (optional): Reason for the reassignment (included in emails)
    """
    return appointment_service.reassign_appointment_doctor(
        appointment_id, 
        reassign_data, 
        current_user, 
        db
    )
