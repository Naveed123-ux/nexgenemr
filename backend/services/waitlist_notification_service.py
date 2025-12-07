"""
WaitlistNotificationService - Manages email notifications for waitlist operations
"""
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import Optional
import os

from models.waitlist_entry_model import WaitlistEntry
from models.waitlist_booking_token_model import WaitlistBookingToken
from models.appointment_slot_model import AppointmentSlot
from models.appointment_session_model import AppointmentSession
from models.patient_profile_model import PatientProfile
from models.user_model import User
from utils.email_utils import (
    send_waitlist_invitation_email,
    send_waitlist_expiry_notification_email
)
from utils.audit_logging import log_waitlist_audit_event


def send_waitlist_invitation(
    waitlist_entry: WaitlistEntry,
    booking_token: WaitlistBookingToken,
    slot: AppointmentSlot,
    db: Session
) -> bool:
    """
    Send waitlist invitation email to patient with booking link.
    
    Args:
        waitlist_entry: WaitlistEntry object with patient and doctor data
        booking_token: WaitlistBookingToken object with token details
        slot: AppointmentSlot object with session data
        db: Database session
        
    Returns:
        True if email sent successfully, False otherwise
    """
    # Get waitlist entry with patient and doctor data if not already loaded
    if not hasattr(waitlist_entry, 'patient') or waitlist_entry.patient is None:
        waitlist_entry = db.query(WaitlistEntry).options(
            joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
            joinedload(WaitlistEntry.doctor)
        ).filter(WaitlistEntry.id == waitlist_entry.id).first()
    
    # Get slot with session data if not already loaded
    if not hasattr(slot, 'session') or slot.session is None:
        slot = db.query(AppointmentSlot).options(
            joinedload(AppointmentSlot.session).joinedload(AppointmentSession.doctor)
        ).filter(AppointmentSlot.id == slot.id).first()
    
    # Extract patient information
    patient_user = waitlist_entry.patient.user
    patient_name = f"{patient_user.first_name} {patient_user.last_name}"
    patient_email = patient_user.email
    
    # Extract doctor information
    doctor_user = waitlist_entry.doctor
    doctor_name = f"{doctor_user.first_name} {doctor_user.last_name}"
    
    # Format appointment time
    appointment_time = slot.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Format expiry time
    expiry_time = booking_token.expires_at.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Generate booking URL with token
    # Get frontend URL from environment variable or use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    booking_url = f"{frontend_url}/patient/book-waitlist/{booking_token.token}"
    
    # Determine if telehealth based on slot modality
    is_telehealth = slot.modality == "telephone" if slot.modality else False
    
    # Get hospital address if in-person (placeholder for now)
    hospital_address = None
    if not is_telehealth:
        # TODO: Get actual hospital address from session or doctor profile
        hospital_address = "Hospital Location"
    
    # Call send_waitlist_invitation_email
    success = send_waitlist_invitation_email(
        recipient_email=patient_email,
        patient_name=patient_name,
        doctor_name=doctor_name,
        appointment_time=appointment_time,
        booking_url=booking_url,
        expiry_time=expiry_time,
        is_telehealth=is_telehealth,
        hospital_address=hospital_address
    )
    
    if success:
        # Update waitlist entry invited_at and invitation_expires_at
        waitlist_entry.invited_at = datetime.utcnow()
        waitlist_entry.invitation_expires_at = booking_token.expires_at
        db.commit()
        
        # Log audit event for invitation send
        log_waitlist_audit_event(
            action="send_invitation",
            user_id=None,  # Triggered by staff but sent by system
            entry_id=waitlist_entry.id,
            patient_profile_id=waitlist_entry.patient_profile_id,
            doctor_user_id=waitlist_entry.doctor_user_id,
            additional_data={
                "token_id": booking_token.id,
                "slot_id": slot.id,
                "expires_at": booking_token.expires_at.isoformat(),
                "patient_email": patient_email
            }
        )
    
    return success


def send_waitlist_expiry_notification(
    waitlist_entry: WaitlistEntry,
    db: Session
) -> bool:
    """
    Send expiry notification email to patient when their waitlist entry expires.
    
    Args:
        waitlist_entry: WaitlistEntry object with patient data
        db: Database session
        
    Returns:
        True if email sent successfully, False otherwise
    """
    # Get waitlist entry with patient data if not already loaded
    if not hasattr(waitlist_entry, 'patient') or waitlist_entry.patient is None:
        waitlist_entry = db.query(WaitlistEntry).options(
            joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
            joinedload(WaitlistEntry.doctor)
        ).filter(WaitlistEntry.id == waitlist_entry.id).first()
    
    # Extract patient information
    patient_user = waitlist_entry.patient.user
    patient_name = f"{patient_user.first_name} {patient_user.last_name}"
    patient_email = patient_user.email
    
    # Extract doctor information
    doctor_user = waitlist_entry.doctor
    doctor_name = f"{doctor_user.first_name} {doctor_user.last_name}"
    
    # Call send_waitlist_expiry_notification_email
    success = send_waitlist_expiry_notification_email(
        recipient_email=patient_email,
        patient_name=patient_name,
        doctor_name=doctor_name
    )
    
    if success:
        print(f"[INFO] Waitlist expiry notification sent for entry {waitlist_entry.id}")
    
    return success
