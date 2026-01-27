from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, contains_eager


from sqlalchemy import text
from pydantic import BaseModel
import math
from typing import List, Optional
from datetime import datetime, timedelta, date, time

from db.db import get_db
from models.user_model import User
from models.appointment_model import Appointment
from models.appointment_session_model import AppointmentSession, SessionStatus, SessionType, SessionRecurrencePattern
from models.appointment_slot_model import AppointmentSlot
from models.availability_template_model import AvailabilityTemplate
from models.patient_profile_model import PatientProfile
from models.doctor_profile_model import DoctorProfile
from models.icd_code_model import ICDCode
from models.appointment_icd_code_model import AppointmentICDCode
from utils.google_calendar_utils import create_calendar_event
from utils.email_utils import (
    send_appointment_confirmation_email,
    send_appointment_reminder_email,
    send_appointment_swap_email,
    send_appointment_cancellation_email,
    send_doctor_reassignment_email_to_patient,
    send_doctor_reassignment_email_to_old_doctor,
    send_doctor_reassignment_email_to_new_doctor
)

class ICDCodeSchema(BaseModel):
    id: int
    code: str
    description: str
    
    class Config:
        from_attributes = True

class AppointmentICDCodeSchema(BaseModel):
    """Schema for ICD codes associated with an appointment"""
    id: int
    icd_code_id: int
    icd_code: ICDCodeSchema
    added_at: datetime
    
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    patient_user_id: int # Changed from patient_profile_id
    appointment_slot_id: int  # Changed from appointment_session_id to slot_id
    is_telehealth: bool
    reason_for_visit: str
    icd_code_id: Optional[int] = None  # Keep for backward compatibility
    icd_code_ids: Optional[List[int]] = None  # New: support multiple ICD codes

class RescheduleRequest(BaseModel):
    new_appointment_slot_id: int  # Changed from new_slot_id for clarity

class SwapAppointmentsRequest(BaseModel):
    appointment_id_1: int
    appointment_id_2: int

class ReassignDoctorRequest(BaseModel):
    new_doctor_user_id: int
    reason: Optional[str] = None

class UpdateAppointmentResultsRequest(BaseModel):
    results: str

class SlotInfoSchema(BaseModel):
    """Schema for slot information in appointment response"""
    id: int
    start_time: datetime
    end_time: datetime
    duration: int
    slot_type: str
    modality: Optional[str] = None
    session_id: int
    session_name: str
    session_type: str
    is_recurring: bool
    recurrence_group_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class LabRequestSummary(BaseModel):
    id: int
    request_type: str
    status: str
    priority: str

    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_profile_id: int
    doctor_user_id: int
    patient_name: str

    doctor_name: str
    start_time: datetime
    end_time: datetime
    is_telehealth: bool
    status: str
    reason_for_visit: Optional[str] = None
    google_meet_link: Optional[str] = None
    results: Optional[str] = None
    icd_codes: Optional[List[ICDCodeSchema]] = []  # New: list of ICD codes
    session_info: Optional[SlotInfoSchema] = None  # New: slot details
    lab_requests: Optional[List[LabRequestSummary]] = []

    class Config:
        from_attributes = True

class PaginatedAppointmentResponse(BaseModel):
    total: int
    page: int
    size: int
    totalPages: int
    appointments: List[AppointmentResponse]

class UpdateAppointmentResultsRequest(BaseModel):
    results: str

def build_appointment_response(appointment: Appointment) -> AppointmentResponse:
    """
    Helper function to build AppointmentResponse with ICD codes and slot info from appointment object.
    """
    # Get ICD codes from the junction table
    icd_codes = [
        ICDCodeSchema(
            id=aicd.icd_code.id,
            code=aicd.icd_code.code,
            description=aicd.icd_code.description
        )
        for aicd in appointment.appointment_icd_codes
    ]
    
    # Get slot information
    session_info = None
    if appointment.slot:
        session_info = SlotInfoSchema(
            id=appointment.slot.id,
            start_time=appointment.slot.start_time,
            end_time=appointment.slot.end_time,
            duration=appointment.slot.duration,
            slot_type=appointment.slot.slot_type.value,
            modality=appointment.slot.modality,
            session_id=appointment.slot.session.id,
            session_name=appointment.slot.session.name,
            session_type=appointment.slot.session.session_type.value,
            is_recurring=appointment.slot.session.is_recurring,
            recurrence_group_id=appointment.slot.session.recurrence_group_id
        )
    
    # Get Lab Requests (using standard query or from backref)
    lab_requests = []
    # Note: LabRequest has a relationship back to Appointment
    from models.lab_request_model import LabRequest
    db = Session.object_session(appointment)
    if db:
        labs = db.query(LabRequest).filter(LabRequest.appointment_id == appointment.id).all()
        lab_requests = [
            LabRequestSummary(
                id=l.id,
                request_type=l.request_type.value,
                status=l.status.value,
                priority=l.priority
            ) for l in labs
        ]

    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient.user.id,
        patient_profile_id=appointment.patient.id,
        doctor_user_id=appointment.doctor_user_id,
        patient_name=f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}",

        doctor_name=f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}",
        start_time=appointment.slot.start_time,
        end_time=appointment.slot.end_time,
        is_telehealth=appointment.is_telehealth,
        status=appointment.status,
        google_meet_link=appointment.google_meet_link,
        reason_for_visit=appointment.reason_for_visit,
        results=appointment.results,
        icd_codes=icd_codes,
        session_info=session_info,
        lab_requests=lab_requests
    )

def generate_appointment_sessions(doctor_id: int, db: Session):
    """
    DEPRECATED: This function is no longer used.
    Slots are now automatically generated when doctors set their availability template.
    The availability template creates recurring patterns that generate slots for 8 weeks ahead.
    
    This endpoint is kept for backward compatibility but returns a message explaining the new system.
    """
    # Check if doctor has recurrence patterns
    patterns = db.query(SessionRecurrencePattern).filter(
        SessionRecurrencePattern.doctor_user_id == doctor_id
    ).all()
    
    if not patterns:
        raise HTTPException(
            status_code=404, 
            detail="Doctor has not set up an availability template. Please use POST /availability/template to set availability."
        )
    
    # Count existing slots
    session_count = db.query(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == doctor_id,
        AppointmentSession.start_time > datetime.utcnow()
    ).count()
    
    return {
        "status": "success",
        "message": f"Doctor has {len(patterns)} recurring patterns with {session_count} upcoming slots. Slots are automatically managed through recurrence patterns.",
        "note": "This endpoint is deprecated. Slots are now generated automatically when setting availability template."
    }

def get_available_slots(doctor_id: int, start_date: date, db: Session):
    """Get available appointment slots for a doctor on a specific date"""
    from services.waitlist_matching_service import get_slot_waitlist_info
    
    end_date = start_date + timedelta(days=1)
    slots = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == doctor_id,
        AppointmentSlot.is_blocked == False,
        AppointmentSlot.is_booked == False,
        AppointmentSlot.start_time >= datetime.combine(start_date, datetime.min.time()),
        AppointmentSlot.start_time < datetime.combine(end_date, datetime.min.time())
    ).order_by(AppointmentSlot.start_time).all()
    
    # Enrich slots with waitlist information
    for slot in slots:
        waitlist_info = get_slot_waitlist_info(slot, db)
        slot.waitlist_match_count = waitlist_info["waitlist_match_count"]
        slot.has_high_priority_matches = waitlist_info["has_high_priority_matches"]
    
    return slots

def create_appointment(db: Session, appt_data: AppointmentCreate, current_user: User):
    db.begin_nested()
    try:
        # 1. Find the patient's profile using their user_id
        patient_profile = db.query(PatientProfile).options(
            joinedload(PatientProfile.user), 
            joinedload(PatientProfile.hospital)
        ).filter(PatientProfile.user_id == appt_data.patient_user_id).first()
        
        if not patient_profile:
            raise HTTPException(status_code=404, detail=f"Patient with user ID {appt_data.patient_user_id} not found.")
            
        # 2. Validate the appointment slot
        # Check for duplicate slots (should not happen, but handle gracefully)
        slot_count = db.query(AppointmentSlot).filter(
            AppointmentSlot.id == appt_data.appointment_slot_id
        ).count()
        
        if slot_count > 1:
            # Log warning about duplicates
            print(f"⚠️ WARNING: Found {slot_count} slots with ID {appt_data.appointment_slot_id}. This should not happen!")
        
        slot = db.query(AppointmentSlot).options(
            joinedload(AppointmentSlot.session).joinedload(AppointmentSession.doctor)
        ).filter(AppointmentSlot.id == appt_data.appointment_slot_id).first()
        
        if not slot:
            raise HTTPException(status_code=404, detail="Appointment slot not found.")
        
        if slot.is_blocked:
            raise HTTPException(status_code=400, detail="This slot is blocked and cannot be booked.")
        
        if slot.is_booked:
            raise HTTPException(status_code=400, detail="This slot is already booked.")

        doctor = slot.session.doctor
        meet_link = None

        # 3. Validate ICD codes (both single and multiple)
        icd_code_ids_to_add = []
        if appt_data.icd_code_ids:
            # New: multiple ICD codes
            icd_codes = db.query(ICDCode).filter(ICDCode.id.in_(appt_data.icd_code_ids)).all()
            if len(icd_codes) != len(appt_data.icd_code_ids):
                found_ids = {icd.id for icd in icd_codes}
                missing_ids = set(appt_data.icd_code_ids) - found_ids
                raise HTTPException(status_code=404, detail=f"ICD codes not found: {missing_ids}")
            icd_code_ids_to_add = appt_data.icd_code_ids
        elif appt_data.icd_code_id:
            # Backward compatibility: single ICD code
            icd_code = db.query(ICDCode).filter(ICDCode.id == appt_data.icd_code_id).first()
            if not icd_code:
                raise HTTPException(status_code=404, detail=f"ICD Code with ID {appt_data.icd_code_id} not found.")
            icd_code_ids_to_add = [appt_data.icd_code_id]
            
        if appt_data.is_telehealth:
            if not doctor.google_auth_token or not doctor.google_auth_token.refresh_token:
                raise HTTPException(status_code=400, detail="This doctor has not enabled telehealth by connecting their Google account.")

            meet_link = create_calendar_event(
                refresh_token=doctor.google_auth_token.refresh_token,
                summary=f"Appointment with {patient_profile.user.first_name} {patient_profile.user.last_name}",
                start_time=slot.start_time,
                end_time=slot.end_time,
                attendees=[patient_profile.user.email, doctor.email]
            )
            if not meet_link:
                raise HTTPException(status_code=500, detail="Failed to create Google Meet link. The refresh token may be invalid.")

        # Mark slot as booked - use explicit update to avoid duplicate issues
        db.query(AppointmentSlot).filter(
            AppointmentSlot.id == slot.id
        ).update({"is_booked": True}, synchronize_session=False)
        
        new_appointment = Appointment(
            patient_profile_id=patient_profile.id,
            doctor_user_id=slot.session.doctor_user_id,
            appointment_slot_id=slot.id,
            appointment_session_id=slot.session_id,  # Keep for backward compatibility
            is_telehealth=appt_data.is_telehealth,
            google_meet_link=meet_link,
            reason_for_visit=appt_data.reason_for_visit,
            icd_code_id=appt_data.icd_code_id,  # Keep for backward compatibility
            status='Confirmed'
        )
        db.add(new_appointment)
        db.flush()
        
        # Add ICD codes to the junction table
        for icd_code_id in icd_code_ids_to_add:
            appointment_icd = AppointmentICDCode(
                appointment_id=new_appointment.id,
                icd_code_id=icd_code_id,
                added_by_user_id=current_user.id,
                added_at=datetime.utcnow()
            )
            db.add(appointment_icd)

        patient_name = f"{patient_profile.user.first_name} {patient_profile.user.last_name}"
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"
        appointment_time_str = slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")

        send_appointment_confirmation_email(
            recipient_email=patient_profile.user.email, patient_name=patient_name, doctor_name=doctor_name,
            appointment_time=appointment_time_str, is_telehealth=appt_data.is_telehealth,
            meet_link=meet_link, hospital_address=patient_profile.hospital.address
        )
        send_appointment_confirmation_email(
            recipient_email=doctor.email, patient_name=patient_name, doctor_name=doctor_name,
            appointment_time=appointment_time_str, is_telehealth=appt_data.is_telehealth,
            meet_link=meet_link, hospital_address=patient_profile.hospital.address
        )

        db.commit()
        
        # Reload appointment with ICD codes and slot info
        db.refresh(new_appointment)
        appointment_with_codes = db.query(Appointment).options(
            joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.doctor),
            joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
        ).filter(Appointment.id == new_appointment.id).first()

        return build_appointment_response(appointment_with_codes)

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")   

def get_appointments(
    db: Session,
    current_user: User,
    page: int,
    size: int,
    target_date: date,
    search_query: Optional[str]
):
    # Base query to fetch appointments with all necessary related data eagerly loaded
    base_query = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.doctor).joinedload(User.doctor_profile).joinedload(DoctorProfile.department),
        joinedload(Appointment.icd_code),  # Eagerly load the old single ICD code relationship
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)  # Load multiple ICD codes
    ).join(Appointment.slot)

    # Filter appointments based on the current user's role and hospital
    user_role = current_user.role.name
    if user_role in ["Hospital_Admin", "Receptionist"]:
        hospital_id = current_user.hospital.id if user_role == "Hospital_Admin" else current_user.staff_profile.hospital_id
        base_query = base_query.join(Appointment.patient).filter(PatientProfile.hospital_id == hospital_id)
    elif user_role == "Doctor":
        base_query = base_query.filter(Appointment.doctor_user_id == current_user.id)

    # Filter appointments by the target date
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())
    base_query = base_query.filter(AppointmentSlot.start_time.between(start_of_day, end_of_day))

    all_appointments = base_query.order_by(AppointmentSlot.start_time).all()

    # Apply search filter if a query is provided
    filtered_appointments = []
    if search_query:
        search_lower = search_query.lower()
        for appt in all_appointments:
            patient_name = f"{appt.patient.user.first_name} {appt.patient.user.last_name}".lower()
            doctor_name = f"{appt.doctor.first_name} {appt.doctor.last_name}".lower()
            if search_lower in patient_name or search_lower in doctor_name:
                filtered_appointments.append(appt)
    else:
        filtered_appointments = all_appointments

    # Paginate the results
    total = len(filtered_appointments)
    total_pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size
    paginated_list = filtered_appointments[offset : offset + size]

    # Return the paginated response
    # The `paginated_list` contains full SQLAlchemy Appointment objects.
    # FastAPI will automatically serialize them using your Pydantic response model,
    # which now includes the `icd_code` field.
    return PaginatedAppointmentResponse(
        total=total,
        page=page,
        size=size,
        totalPages=total_pages,
        appointments=paginated_list
    )

def get_doctor_weekly_appointments(
    db: Session,
    current_user: User,
    start_date: date
):
    if not current_user.role or current_user.role.name != "Doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint.")

    if start_date.weekday() == 6:  # Sunday
        start_of_week = start_date + timedelta(days=1)
    else:
        start_of_week = start_date - timedelta(days=start_date.weekday())

    end_of_week = start_of_week + timedelta(days=6)

    appointments = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
    ).join(Appointment.slot).filter(
        Appointment.doctor_user_id == current_user.id,
        AppointmentSlot.start_time >= datetime.combine(start_of_week, datetime.min.time()),
        AppointmentSlot.start_time <= datetime.combine(end_of_week, datetime.max.time())
    ).all()

    week_schedule = {}
    for i in range(7):
        day = start_of_week + timedelta(days=i)
        week_schedule[day] = []

    for appt in appointments:
        appt_date = appt.slot.start_time.date()
        if appt_date in week_schedule:
            week_schedule[appt_date].append(
                AppointmentResponse(
                    id=appt.id,
                    patient_id=appt.patient.user.id,
                    patient_profile_id=appt.patient.id,
                    patient_name=f"{appt.patient.user.first_name} {appt.patient.user.last_name}",
                    doctor_name=f"Dr. {current_user.first_name} {current_user.last_name}",
                    start_time=appt.slot.start_time,
                    end_time=appt.slot.end_time,
                    is_telehealth=appt.is_telehealth,
                    status=appt.status,
                    google_meet_link=appt.google_meet_link,
                    reason_for_visit=appt.reason_for_visit
                )
            )

    appointments_by_day = {
        str(day): week_schedule[day] for day in sorted(week_schedule.keys())
    }

    return {
        "doctor_id": current_user.id,
        "doctor_name": f"Dr. {current_user.first_name} {current_user.last_name}",
        "week_start": start_of_week,
        "week_end": end_of_week,
        "appointments_by_day": appointments_by_day
    }

def get_upcoming_appointments_for_doctor(db: Session, current_user: User) -> List[AppointmentResponse]:
    """
    Retrieves all upcoming appointments for the currently logged-in doctor.
    """
    if not current_user.role or current_user.role.name != "Doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint.")

    now = datetime.utcnow()
    appointments = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user)
    ).join(Appointment.slot).filter(
        Appointment.doctor_user_id == current_user.id,
        AppointmentSlot.start_time >= now
    ).order_by(AppointmentSlot.start_time.asc()).all()

    return [
        AppointmentResponse(
            id=appt.id,
            patient_id=appt.patient.user.id,
            patient_profile_id=appt.patient.id,
            patient_name=f"{appt.patient.user.first_name} {appt.patient.user.last_name}",
            doctor_name=f"Dr. {current_user.first_name} {current_user.last_name}",
            start_time=appt.slot.start_time,
            end_time=appt.slot.end_time,
            is_telehealth=appt.is_telehealth,
            status=appt.status,
            google_meet_link=appt.google_meet_link,
            reason_for_visit=appt.reason_for_visit
        ) for appt in appointments
    ]


def cancel_appointment(appointment_id: int, current_user: User, db: Session):
    """
    Cancels and deletes an existing appointment, freeing up the slot.
    Sends email notification to the patient.
    """
    appointment = db.query(Appointment).options(
        joinedload(Appointment.slot),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.patient).joinedload(PatientProfile.hospital),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    # Authorization Check
    user_role = current_user.role.name
    can_cancel = False
    if user_role == "Patient" and appointment.patient.user_id == current_user.id:
        can_cancel = True
    elif user_role == "Doctor" and appointment.doctor_user_id == current_user.id:
        can_cancel = True
    elif user_role in ["Receptionist", "Hospital_Admin"]:
        can_cancel = True

    if not can_cancel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to cancel this appointment.")

    # Store appointment details for email before deletion
    patient_name = f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}"
    patient_email = appointment.patient.user.email
    doctor_name = f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}"
    appointment_time = appointment.slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
    is_telehealth = appointment.is_telehealth
    hospital_address = appointment.patient.hospital.address if appointment.patient.hospital else None
    
    # Free up the associated slot
    if appointment.slot:
        appointment.slot.is_booked = False
    
    # Delete the appointment record
    db.delete(appointment)
    
    db.commit()
    
    # Send cancellation email to patient
    try:
        send_appointment_cancellation_email(
            recipient_email=patient_email,
            patient_name=patient_name,
            doctor_name=doctor_name,
            appointment_time=appointment_time,
            is_telehealth=is_telehealth,
            cancelled_by=user_role,
            hospital_address=hospital_address
        )
    except Exception as e:
        # Log error but don't fail the cancellation
        print(f"⚠️ Warning: Failed to send cancellation email: {e}")
    
    return {"detail": "Appointment successfully deleted."}

def reschedule_appointment(appointment_id: int, reschedule_data: RescheduleRequest, current_user: User, db: Session):
    """
    Reschedules an appointment to a new, available time slot.
    """
    db.begin_nested()
    try:
        original_appointment = db.query(Appointment).options(
            joinedload(Appointment.slot),
            joinedload(Appointment.patient)
        ).filter(Appointment.id == appointment_id).first()

        if not original_appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment to reschedule not found.")

        new_slot = db.query(AppointmentSlot).filter(
            AppointmentSlot.id == reschedule_data.new_appointment_slot_id
        ).first()
        
        if not new_slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New appointment slot not found.")
        
        if new_slot.is_blocked:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The selected slot is blocked.")
        
        if new_slot.is_booked:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The selected slot is already booked.")

        # Authorization Check
        user_role = current_user.role.name
        can_reschedule = False
        if user_role == "Patient" and original_appointment.patient.user_id == current_user.id:
            can_reschedule = True
        elif user_role == "Doctor" and original_appointment.doctor_user_id == current_user.id:
            can_reschedule = True
        elif user_role in ["Receptionist", "Hospital_Admin"]:
            can_reschedule = True

        if not can_reschedule:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to reschedule this appointment.")

        old_slot_id = original_appointment.appointment_slot_id
        
        # Use explicit SQL updates to avoid duplicate row issues
        # Free up the old slot
        db.execute(
            text("UPDATE appointment_slots SET is_booked = false WHERE id = :slot_id"),
            {"slot_id": old_slot_id}
        )
        
        # Book the new slot
        db.execute(
            text("UPDATE appointment_slots SET is_booked = true WHERE id = :slot_id"),
            {"slot_id": reschedule_data.new_appointment_slot_id}
        )
        
        # Update appointment
        original_appointment.appointment_slot_id = new_slot.id
        original_appointment.appointment_session_id = new_slot.session_id  # Keep for backward compatibility
        original_appointment.status = "Confirmed"
        
        db.commit()
        
        return {"detail": "Appointment successfully rescheduled."}

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to reschedule appointment: {str(e)}")

def get_my_available_slots(current_user: User, start_date: date, db: Session):
    """
    Retrieves available appointment slots for the currently logged-in doctor for a specific date.
    """
    from services.waitlist_matching_service import get_slot_waitlist_info
    
    if current_user.role.name != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view their own available slots."
        )
    
    doctor_id = current_user.id
    end_date = start_date + timedelta(days=1)
    
    slots = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == doctor_id,
        AppointmentSlot.is_blocked == False,
        AppointmentSlot.is_booked == False,
        AppointmentSlot.start_time >= datetime.combine(start_date, time.min),
        AppointmentSlot.start_time < datetime.combine(end_date, time.min)
    ).order_by(AppointmentSlot.start_time.asc()).all()
    
    # Enrich slots with waitlist information
    for slot in slots:
        waitlist_info = get_slot_waitlist_info(slot, db)
        slot.waitlist_match_count = waitlist_info["waitlist_match_count"]
        slot.has_high_priority_matches = waitlist_info["has_high_priority_matches"]
    
    return slots


def get_all_my_available_slots(current_user: User, db: Session) -> List[AppointmentSlot]:
    """
    Retrieves all upcoming available appointment slots for the currently logged-in doctor.
    """
    from services.waitlist_matching_service import get_slot_waitlist_info
    
    if current_user.role.name != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view their own available slots."
        )
    
    now = datetime.utcnow()
    
    slots = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == current_user.id,
        AppointmentSlot.is_blocked == False,
        AppointmentSlot.is_booked == False,
        AppointmentSlot.start_time >= now
    ).order_by(AppointmentSlot.start_time.asc()).all()
    
    # Enrich slots with waitlist information
    for slot in slots:
        waitlist_info = get_slot_waitlist_info(slot, db)
        slot.waitlist_match_count = waitlist_info["waitlist_match_count"]
        slot.has_high_priority_matches = waitlist_info["has_high_priority_matches"]
    
    return slots


def get_slot_by_id(slot_id: int, db: Session) -> Optional[AppointmentSlot]:
    """
    Get a specific appointment slot by ID with full details.
    """
    from services.waitlist_matching_service import get_slot_waitlist_info
    
    slot = db.query(AppointmentSlot).options(
        joinedload(AppointmentSlot.session).joinedload(AppointmentSession.doctor)
    ).filter(AppointmentSlot.id == slot_id).first()
    
    if slot:
        waitlist_info = get_slot_waitlist_info(slot, db)
        slot.waitlist_match_count = waitlist_info["waitlist_match_count"]
        slot.has_high_priority_matches = waitlist_info["has_high_priority_matches"]
    
    return slot


def get_appointment_by_id(appointment_id: int, db: Session) -> Optional[Appointment]:
    """
    Get a specific appointment by ID with all related data.
    """
    return db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.doctor),
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
    ).filter(Appointment.id == appointment_id).first()


def get_doctor_appointments_by_date_range(
    doctor_id: int,
    start_date: date,
    end_date: date,
    db: Session
) -> List[Appointment]:
    """
    Get all appointments for a doctor within a date range.
    """
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    return db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
    ).join(Appointment.slot).filter(
        Appointment.doctor_user_id == doctor_id,
        AppointmentSlot.start_time >= start_dt,
        AppointmentSlot.start_time <= end_dt
    ).order_by(AppointmentSlot.start_time).all()


def get_doctor_appointments_for_date(
    doctor_id: int,
    target_date: date,
    db: Session
) -> List[AppointmentResponse]:
    """
    Get all appointments for a specific doctor on a specific date.
    Returns AppointmentResponse objects ready for API response.
    """
    appointments = get_doctor_appointments_by_date_range(
        doctor_id=doctor_id,
        start_date=target_date,
        end_date=target_date,
        db=db
    )
    
    return [build_appointment_response(appt) for appt in appointments]


def get_all_doctor_appointments(
    doctor_id: int,
    db: Session,
    include_past: bool = False
) -> List[AppointmentResponse]:
    """
    Get all appointments for a specific doctor.
    By default, only returns upcoming appointments.
    Set include_past=True to get all appointments including past ones.
    """
    query = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.doctor),
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
    ).filter(Appointment.doctor_user_id == doctor_id)
    
    if not include_past:
        now = datetime.utcnow()
        query = query.join(Appointment.slot).filter(AppointmentSlot.start_time >= now)
    else:
        query = query.join(Appointment.slot)
    
    appointments = query.order_by(AppointmentSlot.start_time).all()
    
    return [build_appointment_response(appt) for appt in appointments]


def get_patient_appointments(
    patient_profile_id: int,
    db: Session,
    include_past: bool = False
) -> List[AppointmentResponse]:
    """
    Get all appointments for a patient.
    """
    print(f"DEBUG: Fetching appointments for patient_profile_id={patient_profile_id}, include_past={include_past}")
    
    query = db.query(Appointment).join(Appointment.slot).options(
        contains_eager(Appointment.slot).joinedload(AppointmentSlot.session),
        joinedload(Appointment.doctor),
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
    ).filter(Appointment.patient_profile_id == patient_profile_id)
    
    if not include_past:
        now = datetime.utcnow()
        query = query.filter(AppointmentSlot.start_time >= now)
    
    appointments = query.order_by(AppointmentSlot.start_time.desc()).all()
    print(f"DEBUG: Found {len(appointments)} appointments")
    for a in appointments:
        print(f"  - Appt ID: {a.id}, Slot Time: {a.slot.start_time}, Doctor: {a.doctor.first_name}")


    
    return [build_appointment_response(appt) for appt in appointments]


def block_slot(slot_id: int, current_user: User, db: Session):
    """
    Block a slot so it cannot be booked (doctor only).
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can block slots."
        )
    
    slot = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSlot.id == slot_id
    ).first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    
    if slot.session.doctor_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only block your own slots."
        )
    
    if slot.is_booked:
        raise HTTPException(
            status_code=400,
            detail="Cannot block a slot that is already booked."
        )
    
    slot.is_blocked = True
    db.commit()
    db.refresh(slot)
    
    return slot


def unblock_slot(slot_id: int, current_user: User, db: Session):
    """
    Unblock a previously blocked slot (doctor only).
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can unblock slots."
        )
    
    slot = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSlot.id == slot_id
    ).first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    
    if slot.session.doctor_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only unblock your own slots."
        )
    
    if not slot.is_blocked:
        raise HTTPException(
            status_code=400,
            detail="Slot is not blocked."
        )
    
    slot.is_blocked = False
    db.commit()
    db.refresh(slot)
    
    return slot


def get_appointment_statistics(doctor_id: int, db: Session):
    """
    Get appointment statistics for a doctor.
    """
    now = datetime.utcnow()
    
    # Total appointments
    total = db.query(Appointment).filter(
        Appointment.doctor_user_id == doctor_id
    ).count()
    
    # Upcoming appointments
    upcoming = db.query(Appointment).join(Appointment.slot).filter(
        Appointment.doctor_user_id == doctor_id,
        AppointmentSlot.start_time >= now
    ).count()
    
    # Past appointments
    past = db.query(Appointment).join(Appointment.slot).filter(
        Appointment.doctor_user_id == doctor_id,
        AppointmentSlot.start_time < now
    ).count()
    
    # Available slots
    available_slots = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == doctor_id,
        AppointmentSlot.is_blocked == False,
        AppointmentSlot.is_booked == False,
        AppointmentSlot.start_time >= now
    ).count()
    
    # Blocked slots
    blocked_slots = db.query(AppointmentSlot).join(AppointmentSession).filter(
        AppointmentSession.doctor_user_id == doctor_id,
        AppointmentSlot.is_blocked == True,
        AppointmentSlot.start_time >= now
    ).count()
    
    return {
        "total_appointments": total,
        "upcoming_appointments": upcoming,
        "past_appointments": past,
        "available_slots": available_slots,
        "blocked_slots": blocked_slots
    }


def send_daily_appointment_reminders():
    """
    Finds all appointments scheduled for the next day and sends reminder emails to patients.
    This function is designed to be run as a background task.
    """
    print("--- ⏰ Kicking off daily appointment reminder job ---")
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        tomorrow = date.today() + timedelta(days=1)
        start_of_tomorrow = datetime.combine(tomorrow, time.min)
        end_of_tomorrow = datetime.combine(tomorrow, time.max)

        appointments_tomorrow = db.query(Appointment).options(
            joinedload(Appointment.slot),
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.doctor),
            joinedload(Appointment.patient).joinedload(PatientProfile.hospital)
        ).join(Appointment.slot).filter(
            AppointmentSlot.start_time >= start_of_tomorrow,
            AppointmentSlot.start_time <= end_of_tomorrow,
            Appointment.status == 'Confirmed'
        ).all()

        if not appointments_tomorrow:
            print("  ✅ No appointments scheduled for tomorrow. Job complete.")
            return

        print(f"  📧 Found {len(appointments_tomorrow)} appointments. Sending reminders...")
        for appt in appointments_tomorrow:
            try:
                patient_name = f"{appt.patient.user.first_name} {appt.patient.user.last_name}"
                doctor_name = f"Dr. {appt.doctor.first_name} {appt.doctor.last_name}"
                
                send_appointment_reminder_email(
                    recipient_email=appt.patient.user.email,
                    patient_name=patient_name,
                    doctor_name=doctor_name,
                    appointment_time=appt.slot.start_time.strftime("%A, %B %d at %I:%M %p"),
                    is_telehealth=appt.is_telehealth,
                    meet_link=appt.google_meet_link,
                    hospital_address=appt.patient.hospital.address
                )
            except Exception as e:
                print(f"  ❌ Failed to send reminder for appointment {appt.id}. Error: {e}")
        
        print("  ✅ Reminder job finished successfully.")

    finally:
        db.close()


def swap_appointments(
    swap_data: SwapAppointmentsRequest,
    current_user: User,
    db: Session
):
    """
    Swap the time slots of two appointments.
    Only the doctor who owns both appointments can perform this operation.
    
    This will:
    1. Validate both appointments exist and belong to the same doctor
    2. Swap their appointment slots
    3. Update Google Meet links if needed
    4. Send notification emails to both patients
    """
    print(f"🔄 Swap request received:")
    print(f"   User ID: {current_user.id}, Role: {current_user.role.name}")
    print(f"   Appointment 1 ID: {swap_data.appointment_id_1}")
    print(f"   Appointment 2 ID: {swap_data.appointment_id_2}")
    
    db.begin_nested()
    try:
        # Fetch both appointments with all necessary relationships
        appointment_1 = db.query(Appointment).options(
            joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.patient).joinedload(PatientProfile.hospital),
            joinedload(Appointment.doctor)
        ).filter(Appointment.id == swap_data.appointment_id_1).first()
        
        appointment_2 = db.query(Appointment).options(
            joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.patient).joinedload(PatientProfile.hospital),
            joinedload(Appointment.doctor)
        ).filter(Appointment.id == swap_data.appointment_id_2).first()
        
        # Validation
        if not appointment_1:
            print(f"   ❌ Appointment {swap_data.appointment_id_1} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {swap_data.appointment_id_1} not found"
            )
        
        if not appointment_2:
            print(f"   ❌ Appointment {swap_data.appointment_id_2} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {swap_data.appointment_id_2} not found"
            )
        
        print(f"   Appointment 1 doctor_user_id: {appointment_1.doctor_user_id}")
        print(f"   Appointment 2 doctor_user_id: {appointment_2.doctor_user_id}")
        
        # Authorization: Only the doctor who owns both appointments can swap
        if current_user.role.name != "Doctor":
            print(f"   ❌ User is not a doctor: {current_user.role.name}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can swap appointments"
            )
        
        if appointment_1.doctor_user_id != current_user.id:
            print(f"   ❌ Appointment 1 doesn't belong to user (doctor_id: {appointment_1.doctor_user_id}, user_id: {current_user.id})")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Appointment {swap_data.appointment_id_1} does not belong to you"
            )
        
        if appointment_2.doctor_user_id != current_user.id:
            print(f"   ❌ Appointment 2 doesn't belong to user (doctor_id: {appointment_2.doctor_user_id}, user_id: {current_user.id})")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Appointment {swap_data.appointment_id_2} does not belong to you"
            )
        
        # Prevent swapping the same appointment
        if swap_data.appointment_id_1 == swap_data.appointment_id_2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot swap an appointment with itself"
            )
        
        # Store original slot information for emails
        original_slot_1 = appointment_1.slot
        original_slot_2 = appointment_2.slot
        
        # Swap the slots
        slot_1_id = appointment_1.appointment_slot_id
        slot_2_id = appointment_2.appointment_slot_id
        
        appointment_1.appointment_slot_id = slot_2_id
        appointment_1.appointment_session_id = original_slot_2.session_id
        
        appointment_2.appointment_slot_id = slot_1_id
        appointment_2.appointment_session_id = original_slot_1.session_id
        
        # Handle Google Meet links for telehealth appointments
        if appointment_1.is_telehealth:
            # Recreate Google Meet link for new time
            if appointment_1.doctor.google_auth_token and appointment_1.doctor.google_auth_token.refresh_token:
                new_meet_link = create_calendar_event(
                    refresh_token=appointment_1.doctor.google_auth_token.refresh_token,
                    summary=f"Appointment with {appointment_1.patient.user.first_name} {appointment_1.patient.user.last_name}",
                    start_time=original_slot_2.start_time,
                    end_time=original_slot_2.end_time,
                    attendees=[appointment_1.patient.user.email, appointment_1.doctor.email]
                )
                if new_meet_link:
                    appointment_1.google_meet_link = new_meet_link
        
        if appointment_2.is_telehealth:
            # Recreate Google Meet link for new time
            if appointment_2.doctor.google_auth_token and appointment_2.doctor.google_auth_token.refresh_token:
                new_meet_link = create_calendar_event(
                    refresh_token=appointment_2.doctor.google_auth_token.refresh_token,
                    summary=f"Appointment with {appointment_2.patient.user.first_name} {appointment_2.patient.user.last_name}",
                    start_time=original_slot_1.start_time,
                    end_time=original_slot_1.end_time,
                    attendees=[appointment_2.patient.user.email, appointment_2.doctor.email]
                )
                if new_meet_link:
                    appointment_2.google_meet_link = new_meet_link
        
        db.commit()
        
        # Refresh to get updated slot information
        db.refresh(appointment_1)
        db.refresh(appointment_2)
        
        # Send notification emails to both patients
        doctor_name = f"Dr. {current_user.first_name} {current_user.last_name}"
        
        # Email to Patient 1
        patient_1_name = f"{appointment_1.patient.user.first_name} {appointment_1.patient.user.last_name}"
        old_time_1 = original_slot_1.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
        new_time_1 = appointment_1.slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
        
        send_appointment_swap_email(
            recipient_email=appointment_1.patient.user.email,
            patient_name=patient_1_name,
            doctor_name=doctor_name,
            old_time=old_time_1,
            new_time=new_time_1,
            is_telehealth=appointment_1.is_telehealth,
            meet_link=appointment_1.google_meet_link,
            hospital_address=appointment_1.patient.hospital.address
        )
        
        # Email to Patient 2
        patient_2_name = f"{appointment_2.patient.user.first_name} {appointment_2.patient.user.last_name}"
        old_time_2 = original_slot_2.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
        new_time_2 = appointment_2.slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
        
        send_appointment_swap_email(
            recipient_email=appointment_2.patient.user.email,
            patient_name=patient_2_name,
            doctor_name=doctor_name,
            old_time=old_time_2,
            new_time=new_time_2,
            is_telehealth=appointment_2.is_telehealth,
            meet_link=appointment_2.google_meet_link,
            hospital_address=appointment_2.patient.hospital.address
        )
        
        return {
            "detail": "Appointments swapped successfully",
            "appointment_1": {
                "id": appointment_1.id,
                "patient_name": patient_1_name,
                "old_time": old_time_1,
                "new_time": new_time_1
            },
            "appointment_2": {
                "id": appointment_2.id,
                "patient_name": patient_2_name,
                "old_time": old_time_2,
                "new_time": new_time_2
            }
        }
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to swap appointments: {str(e)}"
        )



def reassign_appointment_doctor(
    appointment_id: int,
    reassign_data: ReassignDoctorRequest,
    current_user: User,
    db: Session
):
    """
    Reassign an appointment to a different doctor.
    Only Hospital Admins can perform this operation.
    
    This will:
    1. Validate the appointment exists
    2. Validate the new doctor exists and belongs to the same hospital
    3. Update the appointment's doctor
    4. Regenerate Google Meet link if telehealth
    5. Send notification emails to patient, old doctor, and new doctor
    """
    print(f"🔄 Doctor reassignment request received:")
    print(f"   User ID: {current_user.id}, Role: {current_user.role.name}")
    print(f"   Appointment ID: {appointment_id}")
    print(f"   New Doctor ID: {reassign_data.new_doctor_user_id}")
    
    # Authorization: Only Hospital Admin can reassign doctors
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Hospital Admins can reassign appointment doctors"
        )
    
    db.begin_nested()
    try:
        # Fetch the appointment with all necessary relationships
        appointment = db.query(Appointment).options(
            joinedload(Appointment.slot).joinedload(AppointmentSlot.session),
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.patient).joinedload(PatientProfile.hospital),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile)
        ).filter(Appointment.id == appointment_id).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {appointment_id} not found"
            )
        
        # Fetch the new doctor with department relationship
        new_doctor = db.query(User).options(
            joinedload(User.doctor_profile).joinedload(DoctorProfile.department),
            joinedload(User.google_auth_token)
        ).filter(User.id == reassign_data.new_doctor_user_id).first()
        
        if not new_doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {reassign_data.new_doctor_user_id} not found"
            )
        
        if not new_doctor.doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {reassign_data.new_doctor_user_id} is not a doctor"
            )
        
        # Verify both doctors belong to the same hospital as the patient
        patient_hospital_id = appointment.patient.hospital_id
        
        # Access hospital_id through department relationship
        if not new_doctor.doctor_profile.department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New doctor does not have a department assigned"
            )
        
        new_doctor_hospital_id = new_doctor.doctor_profile.department.hospital_id
        
        if new_doctor_hospital_id != patient_hospital_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New doctor must belong to the same hospital as the patient"
            )
        
        # Prevent reassigning to the same doctor
        if appointment.doctor_user_id == reassign_data.new_doctor_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appointment is already assigned to this doctor"
            )
        
        # Store old doctor information for emails
        old_doctor = appointment.doctor
        old_doctor_name = f"Dr. {old_doctor.first_name} {old_doctor.last_name}"
        new_doctor_name = f"Dr. {new_doctor.first_name} {new_doctor.last_name}"
        patient_name = f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}"
        appointment_time = appointment.slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
        
        # Update the appointment's doctor
        appointment.doctor_user_id = reassign_data.new_doctor_user_id
        
        # Handle Google Meet link for telehealth appointments
        new_meet_link = None
        if appointment.is_telehealth:
            if new_doctor.google_auth_token and new_doctor.google_auth_token.refresh_token:
                # Create new Google Meet link with the new doctor
                new_meet_link = create_calendar_event(
                    refresh_token=new_doctor.google_auth_token.refresh_token,
                    summary=f"Appointment with {patient_name}",
                    start_time=appointment.slot.start_time,
                    end_time=appointment.slot.end_time,
                    attendees=[appointment.patient.user.email, new_doctor.email]
                )
                if new_meet_link:
                    appointment.google_meet_link = new_meet_link
                else:
                    print(f"⚠️ Warning: Failed to create new Google Meet link for new doctor")
            else:
                print(f"⚠️ Warning: New doctor has not enabled telehealth (no Google auth token)")
                # Keep the old meet link or set to None
                appointment.google_meet_link = None
        
        db.commit()
        db.refresh(appointment)
        
        # Send notification emails
        hospital_address = appointment.patient.hospital.address if appointment.patient.hospital else None
        
        # 1. Email to Patient
        try:
            send_doctor_reassignment_email_to_patient(
                recipient_email=appointment.patient.user.email,
                patient_name=patient_name,
                old_doctor_name=old_doctor_name,
                new_doctor_name=new_doctor_name,
                appointment_time=appointment_time,
                is_telehealth=appointment.is_telehealth,
                meet_link=new_meet_link if appointment.is_telehealth else None,
                hospital_address=hospital_address,
                reason=reassign_data.reason
            )
        except Exception as e:
            print(f"⚠️ Warning: Failed to send email to patient: {e}")
        
        # 2. Email to Old Doctor
        try:
            send_doctor_reassignment_email_to_old_doctor(
                recipient_email=old_doctor.email,
                doctor_name=old_doctor_name,
                patient_name=patient_name,
                new_doctor_name=new_doctor_name,
                appointment_time=appointment_time,
                reason=reassign_data.reason
            )
        except Exception as e:
            print(f"⚠️ Warning: Failed to send email to old doctor: {e}")
        
        # 3. Email to New Doctor
        try:
            send_doctor_reassignment_email_to_new_doctor(
                recipient_email=new_doctor.email,
                doctor_name=new_doctor_name,
                patient_name=patient_name,
                old_doctor_name=old_doctor_name,
                appointment_time=appointment_time,
                is_telehealth=appointment.is_telehealth,
                meet_link=new_meet_link if appointment.is_telehealth else None,
                hospital_address=hospital_address,
                reason_for_visit=appointment.reason_for_visit
            )
        except Exception as e:
            print(f"⚠️ Warning: Failed to send email to new doctor: {e}")
        
        print(f"✅ Successfully reassigned appointment {appointment_id} from {old_doctor_name} to {new_doctor_name}")
        
        return {
            "detail": "Doctor reassigned successfully",
            "appointment_id": appointment.id,
            "patient_name": patient_name,
            "old_doctor": {
                "id": old_doctor.id,
                "name": old_doctor_name
            },
            "new_doctor": {
                "id": new_doctor.id,
                "name": new_doctor_name
            },
            "appointment_time": appointment_time,
            "is_telehealth": appointment.is_telehealth,
            "new_meet_link": new_meet_link if appointment.is_telehealth else None
        }
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reassign doctor: {str(e)}"
        )
