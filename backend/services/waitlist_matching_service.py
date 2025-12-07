"""
WaitlistMatchingService - Identifies matching waitlist entries for available slots
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, cast, Text
from datetime import datetime, date
from typing import List, Dict, Optional
from models.waitlist_entry_model import WaitlistEntry, WaitlistStatus, WaitlistPriority
from models.appointment_slot_model import AppointmentSlot
from models.patient_profile_model import PatientProfile
from models.user_model import User


def find_matches_for_slot(
    slot: AppointmentSlot,
    db: Session
) -> List[WaitlistEntry]:
    """
    Find matching waitlist entries for a given appointment slot.
    
    Matches are determined by:
    - Same doctor as the slot's session
    - Status is PENDING
    - Not expired (expiry_date >= today)
    - Preferred days match the slot's day-of-week OR "Anytime"
    
    Results are ordered by:
    - Priority DESC (HIGH priority first)
    - Created_at ASC (oldest entries first - FIFO)
    
    Args:
        slot: AppointmentSlot object to find matches for
        db: Database session
        
    Returns:
        List of matching WaitlistEntry objects with patient data loaded
    """
    # Extract day-of-week from slot start_time
    # Format: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    slot_day = slot.start_time.strftime("%a")
    
    # Get the doctor_user_id from the slot's session
    doctor_user_id = slot.session.doctor_user_id
    
    # Query WaitlistEntry filtered by doctor, status=PENDING, not expired
    today = date.today()
    
    # Build the query with filters
    query = db.query(WaitlistEntry).filter(
        and_(
            WaitlistEntry.doctor_user_id == doctor_user_id,
            WaitlistEntry.status == WaitlistStatus.PENDING,
            WaitlistEntry.expiry_date >= today
        )
    )
    
    # Filter by preferred_days using JSON contains or "Anytime"
    # We need to check if the preferred_days JSON array contains either:
    # 1. The specific day (e.g., "Mon")
    # 2. "Anytime"
    # Cast to text for PostgreSQL JSON array matching
    query = query.filter(
        or_(
            cast(WaitlistEntry.preferred_days, Text).contains(f'"{slot_day}"'),
            cast(WaitlistEntry.preferred_days, Text).contains('"Anytime"')
        )
    )
    
    # Eager load patient and related data
    query = query.options(
        joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
        joinedload(WaitlistEntry.doctor),
        joinedload(WaitlistEntry.created_by)
    )
    
    # Order by priority DESC (HIGH first), then created_at ASC (oldest first)
    query = query.order_by(
        WaitlistEntry.priority.desc(),
        WaitlistEntry.created_at.asc()
    )
    
    return query.all()


def get_slot_match_count(
    slot_id: int,
    db: Session
) -> int:
    """
    Get the count of matching waitlist entries for a specific slot.
    Optimized to use a count query instead of loading all data.
    
    Args:
        slot_id: ID of the appointment slot
        db: Database session
        
    Returns:
        Count of matching waitlist entries
        
    Raises:
        HTTPException: If slot not found
    """
    # Get the slot with session relationship
    slot = db.query(AppointmentSlot).options(
        joinedload(AppointmentSlot.session)
    ).filter(AppointmentSlot.id == slot_id).first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Appointment slot not found")
    
    # Extract day-of-week from slot start_time
    slot_day = slot.start_time.strftime("%a")
    
    # Get the doctor_user_id from the slot's session
    doctor_user_id = slot.session.doctor_user_id
    
    # Build count query
    today = date.today()
    
    # Cast to text for PostgreSQL JSON array matching
    count = db.query(func.count(WaitlistEntry.id)).filter(
        and_(
            WaitlistEntry.doctor_user_id == doctor_user_id,
            WaitlistEntry.status == WaitlistStatus.PENDING,
            WaitlistEntry.expiry_date >= today,
            or_(
                cast(WaitlistEntry.preferred_days, Text).contains(f'"{slot_day}"'),
                cast(WaitlistEntry.preferred_days, Text).contains('"Anytime"')
            )
        )
    ).scalar()
    
    return count or 0


def has_high_priority_matches_for_slot(
    slot_id: int,
    db: Session
) -> bool:
    """
    Check if a slot has any high priority waitlist matches.
    
    Args:
        slot_id: ID of the appointment slot
        db: Database session
        
    Returns:
        True if there are any HIGH priority matches, False otherwise
        
    Raises:
        HTTPException: If slot not found
    """
    # Get the slot with session relationship
    slot = db.query(AppointmentSlot).options(
        joinedload(AppointmentSlot.session)
    ).filter(AppointmentSlot.id == slot_id).first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Appointment slot not found")
    
    # Extract day-of-week from slot start_time
    slot_day = slot.start_time.strftime("%a")
    
    # Get the doctor_user_id from the slot's session
    doctor_user_id = slot.session.doctor_user_id
    
    # Build count query for HIGH priority entries
    today = date.today()
    
    # Cast to text for PostgreSQL JSON array matching
    count = db.query(func.count(WaitlistEntry.id)).filter(
        and_(
            WaitlistEntry.doctor_user_id == doctor_user_id,
            WaitlistEntry.status == WaitlistStatus.PENDING,
            WaitlistEntry.expiry_date >= today,
            WaitlistEntry.priority == WaitlistPriority.HIGH,
            or_(
                cast(WaitlistEntry.preferred_days, Text).contains(f'"{slot_day}"'),
                cast(WaitlistEntry.preferred_days, Text).contains('"Anytime"')
            )
        )
    ).scalar()
    
    return (count or 0) > 0


def get_slot_waitlist_info(
    slot: AppointmentSlot,
    db: Session
) -> Dict:
    """
    Get waitlist information for a slot without requiring slot_id lookup.
    Optimized for bulk operations where slot is already loaded.
    
    Args:
        slot: AppointmentSlot object
        db: Database session
        
    Returns:
        Dictionary with waitlist_match_count and has_high_priority_matches
    """
    # Extract day-of-week from slot start_time
    slot_day = slot.start_time.strftime("%a")
    
    # Get the doctor_user_id from the slot's session
    doctor_user_id = slot.session.doctor_user_id
    
    # Build queries
    today = date.today()
    
    # Use cast to text for JSON array matching since PostgreSQL JSON operators don't work with .contains()
    base_filter = and_(
        WaitlistEntry.doctor_user_id == doctor_user_id,
        WaitlistEntry.status == WaitlistStatus.PENDING,
        WaitlistEntry.expiry_date >= today,
        or_(
            cast(WaitlistEntry.preferred_days, Text).contains(f'"{slot_day}"'),
            cast(WaitlistEntry.preferred_days, Text).contains('"Anytime"')
        )
    )
    
    # Get total count
    total_count = db.query(func.count(WaitlistEntry.id)).filter(base_filter).scalar() or 0
    
    # Get high priority count
    high_priority_count = db.query(func.count(WaitlistEntry.id)).filter(
        and_(
            base_filter,
            WaitlistEntry.priority == WaitlistPriority.HIGH
        )
    ).scalar() or 0
    
    return {
        "waitlist_match_count": total_count,
        "has_high_priority_matches": high_priority_count > 0
    }


def get_matches_for_cancelled_slot(
    slot_id: int,
    db: Session
) -> Dict:
    """
    Get enriched match data for a cancelled slot, formatted for triage UI consumption.
    
    Returns detailed information about matching patients including:
    - Patient name
    - Patient phone
    - Priority level
    - Notes
    - Days waiting (calculated from created_at)
    
    Args:
        slot_id: ID of the appointment slot
        db: Database session
        
    Returns:
        Dictionary with slot details and enriched match list
        
    Raises:
        HTTPException: If slot not found
    """
    # Get the slot with session relationship
    from models.appointment_session_model import AppointmentSession
    slot = db.query(AppointmentSlot).options(
        joinedload(AppointmentSlot.session).joinedload(AppointmentSession.doctor)
    ).filter(AppointmentSlot.id == slot_id).first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Appointment slot not found")
    
    # Find matches using find_matches_for_slot
    matches = find_matches_for_slot(slot, db)
    
    # Enrich with patient name, phone, days_waiting calculation
    enriched_matches = []
    for entry in matches:
        # Calculate days waiting
        days_waiting = (datetime.utcnow().date() - entry.created_at.date()).days
        
        # Get patient name and phone
        patient_name = f"{entry.patient.user.first_name} {entry.patient.user.last_name}" if entry.patient and entry.patient.user else "Unknown"
        # Note: phone_number is not in User model, so we set it to None
        patient_phone = None  # Phone number not available in current User model
        
        enriched_matches.append({
            "entry_id": entry.id,
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "priority": entry.priority.value,
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat(),
            "days_waiting": days_waiting,
            "preferred_days": entry.preferred_days
        })
    
    # Format for triage UI consumption
    result = {
        "slot_id": slot.id,
        "slot_start_time": slot.start_time.isoformat(),
        "slot_end_time": slot.end_time.isoformat(),
        "doctor_name": f"{slot.session.doctor.first_name} {slot.session.doctor.last_name}" if slot.session.doctor else "Unknown",
        "doctor_user_id": slot.session.doctor_user_id,
        "match_count": len(enriched_matches),
        "matches": enriched_matches
    }
    
    return result
