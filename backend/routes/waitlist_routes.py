"""
Waitlist API Routes - Manages patient waitlist for fully-booked providers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import date

from db.db import get_db
from utils.dependencies import get_current_user
from utils.permissions import check_waitlist_permission
from models.user_model import User
from models.waitlist_entry_model import WaitlistStatus, WaitlistPriority, WaitlistEntry
from models.patient_profile_model import PatientProfile
from services import (
    waitlist_service,
    waitlist_matching_service,
    waitlist_token_service,
    waitlist_notification_service,
    waitlist_metrics_service,
    appointment_service
)
from schemas.waitlist_schema import (
    WaitlistEntryCreate,
    WaitlistEntryUpdate,
    WaitlistEntryResponse,
    WaitlistSummaryResponse,
    DeleteResponse,
    PatientInfo,
    DoctorInfo,
    TriageMatchResponse,
    InvitationRequest,
    InvitationResponse,
    ManualBookingRequest,
    BookingDetailsResponse,
    ClaimRequest
)


router = APIRouter()


def convert_to_response(entry) -> WaitlistEntryResponse:
    """Convert WaitlistEntry model to response schema with nested objects"""
    response_data = {
        "id": entry.id,
        "patient_profile_id": entry.patient_profile_id,
        "doctor_user_id": entry.doctor_user_id,
        "priority": entry.priority,
        "preferred_days": entry.preferred_days,
        "notes": entry.notes,
        "status": entry.status,
        "expiry_date": entry.expiry_date,
        "created_at": entry.created_at,
        "created_by_user_id": entry.created_by_user_id,
        "updated_at": entry.updated_at,
        "updated_by_user_id": entry.updated_by_user_id,
        "invited_at": entry.invited_at,
        "invitation_expires_at": entry.invitation_expires_at,
    }
    
    # Add patient info if loaded
    if entry.patient and entry.patient.user:
        # Note: phone_number is not in User model, so we set it to None
        response_data["patient"] = PatientInfo(
            id=entry.patient.user.id,
            first_name=entry.patient.user.first_name,
            last_name=entry.patient.user.last_name,
            email=entry.patient.user.email,
            phone_number=None  # Phone number not available in current User model
        )
    
    # Add doctor info if loaded
    if entry.doctor:
        response_data["doctor"] = DoctorInfo(
            id=entry.doctor.id,
            first_name=entry.doctor.first_name,
            last_name=entry.doctor.last_name,
            email=entry.doctor.email
        )
    
    return WaitlistEntryResponse(**response_data)


@router.post("/entries", response_model=WaitlistEntryResponse, status_code=status.HTTP_201_CREATED)
def create_waitlist_entry(
    entry_data: WaitlistEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new waitlist entry for a patient.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **patient_profile_id**: ID of the patient profile
    - **doctor_user_id**: ID of the doctor user
    - **priority**: Priority level (normal or high)
    - **preferred_days**: List of preferred days (e.g., ["Mon", "Tue"] or ["Anytime"])
    - **notes**: Optional notes about the waitlist entry
    - **expiry_date**: Optional expiry date (defaults to +30 days if not provided)
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Call WaitlistService.create_waitlist_entry
        entry = waitlist_service.create_waitlist_entry(
            patient_profile_id=entry_data.patient_profile_id,
            doctor_user_id=entry_data.doctor_user_id,
            priority=entry_data.priority,
            preferred_days=entry_data.preferred_days,
            notes=entry_data.notes,
            expiry_date=entry_data.expiry_date,
            created_by_user_id=current_user.id,
            db=db
        )
        
        # Convert to response schema
        return convert_to_response(entry)
        
    except HTTPException as e:
        # Re-raise HTTPExceptions from service layer (including 409 for duplicates)
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create waitlist entry: {str(e)}"
        )


@router.get("/doctors/{doctor_id}/entries", response_model=List[WaitlistEntryResponse])
def get_waitlist_entries_for_doctor(
    doctor_id: int,
    status_filter: Optional[WaitlistStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all waitlist entries for a specific doctor.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin ONLY
    
    Note: This endpoint is NOT accessible to providers (Doctors) as it contains
    patient contact information and personal notes. Providers should use the
    /doctors/{doctor_id}/summary endpoint for aggregate data.
    
    - **doctor_id**: ID of the doctor user
    - **status_filter**: Optional status filter (pending, invited, booked, cancelled, expired)
    """
    # Validate user has permission to view (staff only, not providers)
    check_waitlist_permission(current_user)
    
    try:
        # Call WaitlistService.get_waitlist_entries_for_doctor
        entries = waitlist_service.get_waitlist_entries_for_doctor(
            doctor_user_id=doctor_id,
            status_filter=status_filter,
            db=db
        )
        
        # Convert to response schema
        return [convert_to_response(entry) for entry in entries]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve waitlist entries: {str(e)}"
        )


@router.get("/patients/{patient_id}/entries", response_model=List[WaitlistEntryResponse])
def get_waitlist_entries_for_patient(
    patient_id: int,
    status_filter: Optional[WaitlistStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all waitlist entries for a specific patient.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **patient_id**: ID of the patient profile
    - **status_filter**: Optional status filter (pending, invited, booked, cancelled, expired)
    """
    # Validate user has permission to view (staff only)
    check_waitlist_permission(current_user)
    
    try:
        # Build query with filters
        query = db.query(WaitlistEntry).filter(
            WaitlistEntry.patient_profile_id == patient_id
        )
        
        # Apply optional status filter
        if status_filter is not None:
            query = query.filter(WaitlistEntry.status == status_filter)
        
        # Eager load relationships
        query = query.options(
            joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
            joinedload(WaitlistEntry.doctor),
            joinedload(WaitlistEntry.created_by),
            joinedload(WaitlistEntry.updated_by)
        )
        
        # Order by priority DESC (HIGH first), then created_at ASC (oldest first)
        entries = query.order_by(
            WaitlistEntry.priority.desc(),
            WaitlistEntry.created_at.asc()
        ).all()
        
        # Convert to response schema
        return [convert_to_response(entry) for entry in entries]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve waitlist entries: {str(e)}"
        )


@router.get("/doctors/{doctor_id}/summary", response_model=WaitlistSummaryResponse)
def get_waitlist_summary_for_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get waitlist summary for a doctor.
    
    Accessible by:
    - Front_Desk_Staff, Receptionist, Hospital_Admin (full access)
    - Doctor (read-only, aggregate data only, no patient contact info or notes)
    
    Returns:
    - Total pending count
    - High priority count
    - Distribution by day of week
    
    Note: Providers (Doctors) can only view their own waitlist summary.
    
    - **doctor_id**: ID of the doctor user
    """
    # Check if user is a provider (Doctor)
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own waitlist
        if current_user.id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own waitlist summary"
            )
        # Providers have read-only access (no additional permission check needed)
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        # Get all pending entries for the doctor
        entries = waitlist_service.get_waitlist_entries_for_doctor(
            doctor_user_id=doctor_id,
            status_filter=WaitlistStatus.PENDING,
            db=db
        )
        
        # Calculate total_pending
        total_pending = len(entries)
        
        # Calculate high_priority_count
        high_priority_count = sum(1 for entry in entries if entry.priority == WaitlistPriority.HIGH)
        
        # Group by preferred days for distribution
        by_day = {
            "Mon": 0,
            "Tue": 0,
            "Wed": 0,
            "Thu": 0,
            "Fri": 0,
            "Sat": 0,
            "Sun": 0,
            "Anytime": 0
        }
        
        for entry in entries:
            for day in entry.preferred_days:
                if day in by_day:
                    by_day[day] += 1
        
        # Return summary object (aggregate data only, no patient contact info or notes)
        return WaitlistSummaryResponse(
            doctor_user_id=doctor_id,
            total_pending=total_pending,
            high_priority_count=high_priority_count,
            by_day=by_day
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve waitlist summary: {str(e)}"
        )


@router.patch("/entries/{entry_id}", response_model=WaitlistEntryResponse)
def update_waitlist_entry(
    entry_id: int,
    update_data: WaitlistEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing waitlist entry.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **entry_id**: ID of the waitlist entry to update
    - **priority**: Optional new priority level
    - **preferred_days**: Optional new preferred days
    - **notes**: Optional new notes
    - **expiry_date**: Optional new expiry date
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Call WaitlistService.update_waitlist_entry
        entry = waitlist_service.update_waitlist_entry(
            entry_id=entry_id,
            priority=update_data.priority,
            preferred_days=update_data.preferred_days,
            notes=update_data.notes,
            expiry_date=update_data.expiry_date,
            updated_by_user_id=current_user.id,
            db=db
        )
        
        # Convert to response schema
        return convert_to_response(entry)
        
    except HTTPException as e:
        # Re-raise HTTPExceptions from service layer
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update waitlist entry: {str(e)}"
        )


@router.delete("/entries/{entry_id}", response_model=DeleteResponse)
def remove_waitlist_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a waitlist entry by setting its status to CANCELLED.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **entry_id**: ID of the waitlist entry to remove
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Call WaitlistService.remove_waitlist_entry
        success = waitlist_service.remove_waitlist_entry(
            entry_id=entry_id,
            updated_by_user_id=current_user.id,
            db=db
        )
        
        if success:
            return DeleteResponse(
                detail="Entry removed successfully",
                entry_id=entry_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove waitlist entry"
            )
        
    except HTTPException as e:
        # Re-raise HTTPExceptions from service layer
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove waitlist entry: {str(e)}"
        )



# ============================================================================
# TRIAGE ENDPOINTS
# ============================================================================

@router.get("/slots/{slot_id}/matches", response_model=TriageMatchResponse)
def get_slot_matches(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get matching waitlist entries for a specific appointment slot.
    
    This endpoint is used by the triage interface to display patients
    who match the slot's day-of-week and doctor.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    Returns:
    - Slot details (ID, start/end time, doctor name)
    - Match count
    - Enriched list of matching patients (name, phone, priority, notes, days waiting)
    
    - **slot_id**: ID of the appointment slot
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Call WaitlistMatchingService.get_matches_for_cancelled_slot
        match_data = waitlist_matching_service.get_matches_for_cancelled_slot(
            slot_id=slot_id,
            db=db
        )
        
        # Return match count and enriched match list
        return TriageMatchResponse(**match_data)
        
    except HTTPException as e:
        # Re-raise HTTPExceptions from service layer
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve slot matches: {str(e)}"
        )


@router.post("/entries/{entry_id}/invite", response_model=InvitationResponse)
def send_invitation_to_patient(
    entry_id: int,
    invitation_data: InvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send an invitation to a waitlist patient for a specific appointment slot.
    
    This endpoint:
    1. Validates the waitlist entry exists and is PENDING
    2. Validates the slot is available
    3. Generates a booking token (24-hour expiry)
    4. Sends invitation email to patient
    5. Updates entry status to INVITED
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **entry_id**: ID of the waitlist entry
    - **appointment_slot_id**: ID of the appointment slot to invite patient for
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Validate entry exists and is PENDING
        entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Waitlist entry not found"
            )
        
        if entry.status != WaitlistStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot invite patient with status {entry.status.value}. Entry must be PENDING."
            )
        
        # Validate slot is available
        from models.appointment_slot_model import AppointmentSlot
        slot = db.query(AppointmentSlot).filter(
            AppointmentSlot.id == invitation_data.appointment_slot_id
        ).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment slot not found"
            )
        
        if slot.is_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is already booked"
            )
        
        if slot.is_blocked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is blocked and cannot be used"
            )
        
        # Generate booking token via WaitlistTokenService (24-hour expiry)
        booking_token = waitlist_token_service.generate_booking_token(
            waitlist_entry_id=entry_id,
            appointment_slot_id=invitation_data.appointment_slot_id,
            expiry_hours=24,
            db=db
        )
        
        # Send invitation via WaitlistNotificationService
        invitation_sent = waitlist_notification_service.send_waitlist_invitation(
            waitlist_entry=entry,
            booking_token=booking_token,
            slot=slot,
            db=db
        )
        
        # Update entry status to INVITED
        entry = waitlist_service.update_waitlist_entry_status(
            entry_id=entry_id,
            new_status=WaitlistStatus.INVITED,
            updated_by_user_id=current_user.id,
            db=db
        )
        
        # Return token details and confirmation
        return InvitationResponse(
            token=booking_token.token,
            expires_at=booking_token.expires_at,
            invitation_sent=invitation_sent,
            entry_id=entry_id,
            slot_id=invitation_data.appointment_slot_id
        )
        
    except HTTPException as e:
        # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}"
        )


@router.post("/entries/{entry_id}/book")
def manual_book_from_waitlist(
    entry_id: int,
    booking_data: ManualBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually book an appointment for a waitlist patient.
    
    This endpoint is used when staff calls the patient and books them directly
    (as opposed to sending an invitation link).
    
    This endpoint:
    1. Validates the waitlist entry exists and is PENDING
    2. Validates the slot is available
    3. Creates an appointment using existing appointment_service
    4. Updates entry status to BOOKED
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    - **entry_id**: ID of the waitlist entry
    - **appointment_slot_id**: ID of the appointment slot to book
    - **is_telehealth**: Whether the appointment is telehealth
    - **reason_for_visit**: Reason for the visit
    """
    # Validate user has permission
    check_waitlist_permission(current_user)
    
    try:
        # Validate entry exists and is PENDING
        entry = db.query(WaitlistEntry).options(
            joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user)
        ).filter(WaitlistEntry.id == entry_id).first()
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Waitlist entry not found"
            )
        
        if entry.status != WaitlistStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book patient with status {entry.status.value}. Entry must be PENDING."
            )
        
        # Validate slot is available
        from models.appointment_slot_model import AppointmentSlot
        slot = db.query(AppointmentSlot).filter(
            AppointmentSlot.id == booking_data.appointment_slot_id
        ).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment slot not found"
            )
        
        if slot.is_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is already booked"
            )
        
        if slot.is_blocked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot is blocked and cannot be used"
            )
        
        # Get patient_user_id from the waitlist entry
        patient_user_id = entry.patient.user_id
        
        # Create appointment using existing appointment_service
        from services.appointment_service import AppointmentCreate
        appt_data = AppointmentCreate(
            patient_user_id=patient_user_id,
            appointment_slot_id=booking_data.appointment_slot_id,
            is_telehealth=booking_data.is_telehealth,
            reason_for_visit=booking_data.reason_for_visit
        )
        
        appointment = appointment_service.create_appointment(
            db=db,
            appt_data=appt_data,
            current_user=current_user
        )
        
        # Update entry status to BOOKED
        entry = waitlist_service.update_waitlist_entry_status(
            entry_id=entry_id,
            new_status=WaitlistStatus.BOOKED,
            updated_by_user_id=current_user.id,
            db=db
        )
        
        # Return created appointment
        return appointment
        
    except HTTPException as e:
        # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to book appointment: {str(e)}"
        )


# ============================================================================
# PATIENT BOOKING ENDPOINTS (PUBLIC - NO AUTH REQUIRED)
# ============================================================================

@router.get("/book/{token}", response_model=BookingDetailsResponse)
def get_booking_details(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate token and get booking details for patient.
    
    This is a PUBLIC endpoint (no authentication required).
    Patients access this via the link in their invitation email.
    
    Returns:
    - Validation status
    - Appointment details if valid
    - Error message if invalid
    
    - **token**: Booking token from invitation email
    """
    try:
        # Validate token via WaitlistTokenService
        is_valid, error_message, error_type = waitlist_token_service.validate_token(
            token=token,
            db=db
        )
        
        # If token is invalid, return error response
        if not is_valid:
            return BookingDetailsResponse(
                valid=False,
                slot_available=False,
                error_message=error_message
            )
        
        # Get token record with relationships
        from models.waitlist_booking_token_model import WaitlistBookingToken
        from models.doctor_profile_model import DoctorProfile
        from models.department_model import Department
        from models.hospital_model import Hospital
        
        token_record = db.query(WaitlistBookingToken).options(
            joinedload(WaitlistBookingToken.waitlist_entry)
                .joinedload(WaitlistEntry.patient)
                .joinedload(PatientProfile.user),
            joinedload(WaitlistBookingToken.waitlist_entry)
                .joinedload(WaitlistEntry.doctor)
                .joinedload(User.doctor_profile)
                .joinedload(DoctorProfile.department)
                .joinedload(Department.hospital),
            joinedload(WaitlistBookingToken.appointment_slot)
        ).filter(WaitlistBookingToken.token == token).first()
        
        if not token_record:
            return BookingDetailsResponse(
                valid=False,
                slot_available=False,
                error_message="Invalid booking link"
            )
        
        # Get slot and patient details
        slot = token_record.appointment_slot
        waitlist_entry = token_record.waitlist_entry
        patient = waitlist_entry.patient.user
        doctor = waitlist_entry.doctor
        
        # Determine if telehealth based on slot modality
        # Note: modality is on the slot, not the session
        is_telehealth = slot.modality == "telephone" if slot.modality else False
        
        # Get hospital name from doctor profile through department
        hospital_name = None
        if doctor.doctor_profile and doctor.doctor_profile.department and doctor.doctor_profile.department.hospital:
            hospital_name = doctor.doctor_profile.department.hospital.name
        
        # Return booking details
        return BookingDetailsResponse(
            valid=True,
            slot_available=not slot.is_booked,
            patient_name=f"{patient.first_name} {patient.last_name}",
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            appointment_time=slot.start_time,
            appointment_end_time=slot.end_time,
            is_telehealth=is_telehealth,
            hospital_name=hospital_name
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve booking details: {str(e)}"
        )


@router.post("/book/{token}/claim")
def claim_appointment_with_token(
    token: str,
    claim_data: ClaimRequest,
    db: Session = Depends(get_db)
):
    """
    Claim an appointment using a booking token.
    
    This is a PUBLIC endpoint (no authentication required).
    Patients access this via the link in their invitation email.
    
    This endpoint:
    1. Validates token is still valid
    2. Checks slot is still available (race condition handling)
    3. Creates appointment with transaction
    4. Marks token as USED
    5. Updates waitlist entry status to BOOKED
    6. Sends confirmation email
    
    Returns appointment details or error.
    
    - **token**: Booking token from invitation email
    - **reason_for_visit**: Optional reason for the visit
    """
    try:
        # Validate token is still valid
        is_valid, error_message, error_type = waitlist_token_service.validate_token(
            token=token,
            db=db
        )
        
        if not is_valid:
            # Return appropriate error status based on error_type
            if error_type == "not_found":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=error_message
                )
            elif error_type == "expired":
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail=error_message
                )
            elif error_type in ["already_used", "slot_filled", "cancelled"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=error_message
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_message
                )
        
        # Get token record with relationships
        from models.waitlist_booking_token_model import WaitlistBookingToken
        from models.doctor_profile_model import DoctorProfile
        from models.department_model import Department
        from models.hospital_model import Hospital
        
        token_record = db.query(WaitlistBookingToken).options(
            joinedload(WaitlistBookingToken.waitlist_entry)
                .joinedload(WaitlistEntry.patient)
                .joinedload(PatientProfile.user),
            joinedload(WaitlistBookingToken.waitlist_entry)
                .joinedload(WaitlistEntry.doctor)
                .joinedload(User.doctor_profile)
                .joinedload(DoctorProfile.department)
                .joinedload(Department.hospital),
            joinedload(WaitlistBookingToken.appointment_slot)
        ).filter(WaitlistBookingToken.token == token).first()
        
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid booking link"
            )
        
        # Use database transaction with row locking for race condition handling
        from models.appointment_slot_model import AppointmentSlot
        
        # Start transaction
        db.begin_nested()
        
        try:
            # Lock the slot row for update (prevents concurrent bookings)
            slot = db.query(AppointmentSlot).filter(
                AppointmentSlot.id == token_record.appointment_slot_id
            ).with_for_update().first()
            
            if not slot:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Appointment slot not found"
                )
            
            # Check slot is still available within transaction
            if slot.is_booked:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Sorry, this appointment has already been filled"
                )
            
            if slot.is_blocked:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This slot is blocked and cannot be booked"
                )
            
            # Determine if telehealth based on slot modality
            # Note: modality is on the slot, not the session
            is_telehealth = slot.modality == "telephone" if slot.modality else False
            
            # Get patient_user_id from waitlist entry
            waitlist_entry = token_record.waitlist_entry
            patient_user_id = waitlist_entry.patient.user_id
            
            # Set default reason for visit if not provided
            reason = claim_data.reason_for_visit or "Waitlist appointment"
            
            # Create appointment using existing appointment_service
            from services.appointment_service import AppointmentCreate
            appt_data = AppointmentCreate(
                patient_user_id=patient_user_id,
                appointment_slot_id=token_record.appointment_slot_id,
                is_telehealth=is_telehealth,
                reason_for_visit=reason
            )
            
            # Create appointment (this will mark slot as booked)
            # Note: We pass None for current_user since this is a public endpoint
            appointment = appointment_service.create_appointment(
                db=db,
                appt_data=appt_data,
                current_user=None  # Public endpoint, no authenticated user
            )
            
            # Mark token as USED
            waitlist_token_service.mark_token_as_used(
                token=token,
                db=db
            )
            
            # Update waitlist entry status to BOOKED
            waitlist_service.update_waitlist_entry_status(
                entry_id=waitlist_entry.id,
                new_status=WaitlistStatus.BOOKED,
                updated_by_user_id=patient_user_id,  # Patient booked themselves
                db=db
            )
            
            # Commit transaction
            db.commit()
            
            # Send confirmation email
            patient = waitlist_entry.patient.user
            doctor = waitlist_entry.doctor
            
            # Get hospital address for in-person appointments
            hospital_address = None
            meet_link = None
            
            if is_telehealth:
                # Get meet link from appointment if available
                meet_link = appointment.google_meet_link if hasattr(appointment, 'google_meet_link') else None
            else:
                # Get hospital address through department
                if doctor.doctor_profile and doctor.doctor_profile.department and doctor.doctor_profile.department.hospital:
                    hospital = doctor.doctor_profile.department.hospital
                    hospital_address = f"{hospital.name}, {hospital.address}" if hasattr(hospital, 'address') else hospital.name
            
            # Send confirmation email
            from utils.email_utils import send_appointment_confirmation_email
            send_appointment_confirmation_email(
                recipient_email=patient.email,
                patient_name=f"{patient.first_name} {patient.last_name}",
                doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
                appointment_time=slot.start_time.strftime("%B %d, %Y at %I:%M %p"),
                is_telehealth=is_telehealth,
                meet_link=meet_link,
                hospital_address=hospital_address
            )
            
            # Return appointment details
            return appointment
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create appointment: {str(e)}"
            )
        
    except HTTPException as e:
        # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to claim appointment: {str(e)}"
        )



# ============================================================================
# METRICS ENDPOINTS
# ============================================================================

@router.get("/metrics/time-to-booking")
def get_time_to_booking_metrics(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get average time from waitlist entry creation to booking.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin, Doctor (own data only)
    
    Returns:
    - Average days from waitlist to booking
    - Total booked entries
    - Breakdown by priority level
    
    Query Parameters:
    - **doctor_id**: Optional filter by specific doctor
    - **start_date**: Optional start date (YYYY-MM-DD)
    - **end_date**: Optional end date (YYYY-MM-DD)
    """
    # Check permissions
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own metrics
        if doctor_id and doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own metrics"
            )
        doctor_id = current_user.id
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        metrics = waitlist_metrics_service.get_average_time_to_booking(
            doctor_user_id=doctor_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve time-to-booking metrics: {str(e)}"
        )


@router.get("/metrics/invitation-acceptance")
def get_invitation_acceptance_metrics(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get invitation acceptance rate metrics.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin, Doctor (own data only)
    
    Returns:
    - Acceptance rate (percentage)
    - Total invitations sent
    - Total accepted
    - Total expired
    - Total cancelled
    
    Query Parameters:
    - **doctor_id**: Optional filter by specific doctor
    - **start_date**: Optional start date (YYYY-MM-DD)
    - **end_date**: Optional end date (YYYY-MM-DD)
    """
    # Check permissions
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own metrics
        if doctor_id and doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own metrics"
            )
        doctor_id = current_user.id
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        metrics = waitlist_metrics_service.get_invitation_acceptance_rate(
            doctor_user_id=doctor_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve invitation acceptance metrics: {str(e)}"
        )


@router.get("/metrics/slot-fill-rate")
def get_slot_fill_rate_metrics(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get slot fill rate from waitlist metrics.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin, Doctor (own data only)
    
    Returns:
    - Fill rate (percentage)
    - Total waitlist entries
    - Total booked
    - Total pending
    - Total expired
    - Total cancelled
    
    Query Parameters:
    - **doctor_id**: Optional filter by specific doctor
    - **start_date**: Optional start date (YYYY-MM-DD)
    - **end_date**: Optional end date (YYYY-MM-DD)
    """
    # Check permissions
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own metrics
        if doctor_id and doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own metrics"
            )
        doctor_id = current_user.id
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        metrics = waitlist_metrics_service.get_slot_fill_rate_from_waitlist(
            doctor_user_id=doctor_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve slot fill rate metrics: {str(e)}"
        )


@router.get("/metrics/demand-trends")
def get_demand_trends_metrics(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    days: int = Query(30, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get waitlist demand trends over time.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin, Doctor (own data only)
    
    Returns:
    - Daily entry counts
    - Priority distribution
    - Total entries in period
    
    Query Parameters:
    - **doctor_id**: Optional filter by specific doctor
    - **days**: Number of days to look back (default 30)
    """
    # Check permissions
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own metrics
        if doctor_id and doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own metrics"
            )
        doctor_id = current_user.id
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        metrics = waitlist_metrics_service.get_waitlist_demand_trends(
            doctor_user_id=doctor_id,
            days=days,
            db=db
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve demand trends: {str(e)}"
        )


@router.get("/metrics/comprehensive")
def get_comprehensive_metrics(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive waitlist metrics in a single call.
    
    Accessible by: Front_Desk_Staff, Receptionist, Hospital_Admin, Doctor (own data only)
    
    Returns all metrics combined:
    - Time to booking
    - Invitation acceptance rate
    - Slot fill rate
    - Demand trends (last 30 days)
    
    Query Parameters:
    - **doctor_id**: Optional filter by specific doctor
    - **start_date**: Optional start date (YYYY-MM-DD)
    - **end_date**: Optional end date (YYYY-MM-DD)
    """
    # Check permissions
    is_provider = current_user.role and current_user.role.name == "Doctor"
    
    if is_provider:
        # Providers can only view their own metrics
        if doctor_id and doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Providers can only view their own metrics"
            )
        doctor_id = current_user.id
    else:
        # Staff must have waitlist management permission
        check_waitlist_permission(current_user)
    
    try:
        metrics = waitlist_metrics_service.get_comprehensive_metrics(
            doctor_user_id=doctor_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve comprehensive metrics: {str(e)}"
        )
