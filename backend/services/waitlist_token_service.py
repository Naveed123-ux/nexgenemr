"""
WaitlistTokenService - Manages booking tokens for waitlist invitations
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import Optional, Tuple
import secrets

from models.waitlist_booking_token_model import WaitlistBookingToken, TokenStatus
from models.waitlist_entry_model import WaitlistEntry
from models.appointment_slot_model import AppointmentSlot
from utils.audit_logging import log_waitlist_audit_event


def generate_booking_token(
    waitlist_entry_id: int,
    appointment_slot_id: int,
    expiry_hours: int,
    db: Session
) -> WaitlistBookingToken:
    """
    Generate a cryptographically secure booking token for a waitlist invitation.
    
    Args:
        waitlist_entry_id: ID of the waitlist entry
        appointment_slot_id: ID of the appointment slot
        expiry_hours: Number of hours until token expires (typically 24)
        db: Database session
        
    Returns:
        Created WaitlistBookingToken object
        
    Raises:
        HTTPException: If waitlist entry or slot not found
    """
    # Validate waitlist_entry_id exists
    waitlist_entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.id == waitlist_entry_id
    ).first()
    if not waitlist_entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    # Validate appointment_slot_id exists
    appointment_slot = db.query(AppointmentSlot).filter(
        AppointmentSlot.id == appointment_slot_id
    ).first()
    if not appointment_slot:
        raise HTTPException(status_code=404, detail="Appointment slot not found")
    
    # Generate cryptographically secure random token using secrets module
    # Generate 32-byte URL-safe token
    token_string = secrets.token_urlsafe(32)
    
    # Calculate expiry time (24 hours from now)
    expires_at = datetime.utcnow() + timedelta(hours=expiry_hours)
    
    # Create WaitlistBookingToken record
    new_token = WaitlistBookingToken(
        token=token_string,
        waitlist_entry_id=waitlist_entry_id,
        appointment_slot_id=appointment_slot_id,
        status=TokenStatus.ACTIVE,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        used_at=None
    )
    
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    return new_token


def validate_token(
    token: str,
    db: Session
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validate a booking token and check if it can be used.
    
    Args:
        token: Token string to validate
        db: Database session
        
    Returns:
        Tuple of (is_valid, error_message, error_type)
        - (True, None, None) if token is valid
        - (False, error_message, error_type) if token is invalid
        
        error_type can be:
        - "not_found": Token doesn't exist (404)
        - "expired": Token has expired (410)
        - "already_used": Token was already used (409)
        - "slot_filled": Slot is already booked (409)
        - "cancelled": Token was cancelled (409)
        - "invalid": Other validation errors (400)
    """
    # Query token by token string
    token_record = db.query(WaitlistBookingToken).options(
        joinedload(WaitlistBookingToken.waitlist_entry),
        joinedload(WaitlistBookingToken.appointment_slot)
    ).filter(WaitlistBookingToken.token == token).first()
    
    # Check if token exists
    if not token_record:
        return (False, "Invalid booking link", "not_found")
    
    # Check if status is ACTIVE
    if token_record.status != TokenStatus.ACTIVE:
        if token_record.status == TokenStatus.USED:
            return (False, "This booking link has already been used", "already_used")
        elif token_record.status == TokenStatus.EXPIRED:
            return (False, "This invitation has expired", "expired")
        elif token_record.status == TokenStatus.CANCELLED:
            return (False, "This booking link has been cancelled", "cancelled")
        else:
            return (False, "This booking link is no longer valid", "invalid")
    
    # Check if expires_at > now
    if token_record.expires_at <= datetime.utcnow():
        return (False, "This invitation has expired", "expired")
    
    # Check if linked slot is still available (not booked)
    if token_record.appointment_slot.is_booked:
        return (False, "Sorry, this appointment has already been filled", "slot_filled")
    
    # All checks passed
    return (True, None, None)


def mark_token_as_used(
    token: str,
    db: Session
) -> WaitlistBookingToken:
    """
    Mark a booking token as used after successful appointment booking.
    
    Args:
        token: Token string to mark as used
        db: Database session
        
    Returns:
        Updated WaitlistBookingToken object
        
    Raises:
        HTTPException: If token not found
    """
    # Query token by token string
    token_record = db.query(WaitlistBookingToken).filter(
        WaitlistBookingToken.token == token
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Update token status to USED
    token_record.status = TokenStatus.USED
    
    # Set used_at timestamp
    token_record.used_at = datetime.utcnow()
    
    db.commit()
    db.refresh(token_record)
    
    # Log audit event for token usage (booking claim)
    # Load the waitlist entry to get patient and doctor IDs
    token_with_entry = db.query(WaitlistBookingToken).options(
        joinedload(WaitlistBookingToken.waitlist_entry)
    ).filter(WaitlistBookingToken.id == token_record.id).first()
    
    if token_with_entry and token_with_entry.waitlist_entry:
        log_waitlist_audit_event(
            action="claim_booking",
            user_id=None,  # Patient action, no authenticated user
            entry_id=token_with_entry.waitlist_entry_id,
            patient_profile_id=token_with_entry.waitlist_entry.patient_profile_id,
            doctor_user_id=token_with_entry.waitlist_entry.doctor_user_id,
            additional_data={
                "token_id": token_record.id,
                "slot_id": token_record.appointment_slot_id,
                "used_at": token_record.used_at.isoformat()
            }
        )
    
    return token_record


def expire_old_tokens(db: Session) -> int:
    """
    Background job function to expire old booking tokens.
    Queries tokens where expires_at < now AND status = ACTIVE,
    then updates their status to EXPIRED.
    
    Args:
        db: Database session
        
    Returns:
        Count of expired tokens
    """
    now = datetime.utcnow()
    
    # Query tokens where expires_at < now AND status = ACTIVE
    expired_tokens = db.query(WaitlistBookingToken).filter(
        and_(
            WaitlistBookingToken.expires_at < now,
            WaitlistBookingToken.status == TokenStatus.ACTIVE
        )
    ).all()
    
    count = len(expired_tokens)
    
    # Update status to EXPIRED
    for token in expired_tokens:
        token.status = TokenStatus.EXPIRED
    
    if count > 0:
        db.commit()
        print(f"[AUDIT] Expired {count} booking tokens at {now.isoformat()}")
    
    return count
