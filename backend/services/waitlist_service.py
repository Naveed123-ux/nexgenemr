"""
WaitlistService - Manages CRUD operations for waitlist entries
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import datetime, date, timedelta
from typing import Optional, List
from models.waitlist_entry_model import WaitlistEntry, WaitlistStatus, WaitlistPriority
from models.patient_profile_model import PatientProfile
from models.user_model import User
from utils.audit_logging import log_waitlist_audit_event
import json


def create_waitlist_entry(
    patient_profile_id: int,
    doctor_user_id: int,
    priority: WaitlistPriority,
    preferred_days: List[str],
    notes: Optional[str],
    expiry_date: Optional[date],
    created_by_user_id: int,
    db: Session
) -> WaitlistEntry:
    """
    Create a new waitlist entry for a patient.
    
    Args:
        patient_profile_id: ID of the patient profile
        doctor_user_id: ID of the doctor user
        priority: Priority level (NORMAL or HIGH)
        preferred_days: List of preferred days (e.g., ["Mon", "Tue"] or ["Anytime"])
        notes: Optional notes about the waitlist entry
        expiry_date: Optional expiry date (defaults to +30 days if not provided)
        created_by_user_id: ID of the user creating the entry
        db: Database session
        
    Returns:
        Created WaitlistEntry with relationships loaded
        
    Raises:
        HTTPException: If validation fails or duplicate entry exists
    """
    # Validate patient_profile_id exists
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_profile_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Validate doctor_user_id exists
    doctor = db.query(User).filter(User.id == doctor_user_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check for duplicate entries (same patient + doctor + status=PENDING)
    existing_entry = db.query(WaitlistEntry).filter(
        and_(
            WaitlistEntry.patient_profile_id == patient_profile_id,
            WaitlistEntry.doctor_user_id == doctor_user_id,
            WaitlistEntry.status == WaitlistStatus.PENDING
        )
    ).first()
    
    if existing_entry:
        raise HTTPException(
            status_code=409,
            detail="Patient already on waitlist for this doctor"
        )
    
    # Set default expiry_date to +30 days if not provided
    if expiry_date is None:
        expiry_date = date.today() + timedelta(days=30)
    
    # Create WaitlistEntry with status PENDING
    new_entry = WaitlistEntry(
        patient_profile_id=patient_profile_id,
        doctor_user_id=doctor_user_id,
        priority=priority,
        preferred_days=preferred_days,
        notes=notes,
        status=WaitlistStatus.PENDING,
        expiry_date=expiry_date,
        created_by_user_id=created_by_user_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_entry)
    db.commit()
    
    # Reload with relationships
    db.refresh(new_entry)
    entry_with_relationships = db.query(WaitlistEntry).options(
        joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
        joinedload(WaitlistEntry.doctor),
        joinedload(WaitlistEntry.created_by)
    ).filter(WaitlistEntry.id == new_entry.id).first()
    
    # Log audit event for entry creation
    log_waitlist_audit_event(
        action="create_entry",
        user_id=created_by_user_id,
        entry_id=new_entry.id,
        patient_profile_id=patient_profile_id,
        doctor_user_id=doctor_user_id,
        new_values={
            "priority": priority.value,
            "preferred_days": preferred_days,
            "notes": notes,
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
            "status": WaitlistStatus.PENDING.value
        }
    )
    
    return entry_with_relationships


def get_waitlist_entries_for_doctor(
    doctor_user_id: int,
    status_filter: Optional[WaitlistStatus],
    db: Session
) -> List[WaitlistEntry]:
    """
    Get all waitlist entries for a specific doctor.
    
    Args:
        doctor_user_id: ID of the doctor user
        status_filter: Optional status filter
        db: Database session
        
    Returns:
        List of WaitlistEntry objects ordered by priority DESC, created_at ASC
    """
    # Build query with filters
    query = db.query(WaitlistEntry).filter(
        WaitlistEntry.doctor_user_id == doctor_user_id
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
    query = query.order_by(
        WaitlistEntry.priority.desc(),
        WaitlistEntry.created_at.asc()
    )
    
    return query.all()


def update_waitlist_entry(
    entry_id: int,
    priority: Optional[WaitlistPriority],
    preferred_days: Optional[List[str]],
    notes: Optional[str],
    expiry_date: Optional[date],
    updated_by_user_id: int,
    db: Session
) -> WaitlistEntry:
    """
    Update an existing waitlist entry.
    
    Args:
        entry_id: ID of the waitlist entry
        priority: Optional new priority level
        preferred_days: Optional new preferred days
        notes: Optional new notes
        expiry_date: Optional new expiry date
        updated_by_user_id: ID of the user updating the entry
        db: Database session
        
    Returns:
        Updated WaitlistEntry
        
    Raises:
        HTTPException: If entry not found
    """
    # Validate entry exists
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    # Store old values for audit trail
    old_values = {
        "priority": entry.priority.value if entry.priority else None,
        "preferred_days": entry.preferred_days,
        "notes": entry.notes,
        "expiry_date": entry.expiry_date.isoformat() if entry.expiry_date else None
    }
    
    # Update allowed fields
    if priority is not None:
        entry.priority = priority
    if preferred_days is not None:
        entry.preferred_days = preferred_days
    if notes is not None:
        entry.notes = notes
    if expiry_date is not None:
        entry.expiry_date = expiry_date
    
    # Update audit fields
    entry.updated_at = datetime.utcnow()
    entry.updated_by_user_id = updated_by_user_id
    
    db.commit()
    db.refresh(entry)
    
    # Reload with relationships
    entry_with_relationships = db.query(WaitlistEntry).options(
        joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
        joinedload(WaitlistEntry.doctor),
        joinedload(WaitlistEntry.created_by),
        joinedload(WaitlistEntry.updated_by)
    ).filter(WaitlistEntry.id == entry.id).first()
    
    # Record modification in audit trail
    new_values = {
        "priority": entry.priority.value if entry.priority else None,
        "preferred_days": entry.preferred_days,
        "notes": entry.notes,
        "expiry_date": entry.expiry_date.isoformat() if entry.expiry_date else None
    }
    
    # Log audit event for entry update
    log_waitlist_audit_event(
        action="update_entry",
        user_id=updated_by_user_id,
        entry_id=entry_id,
        patient_profile_id=entry.patient_profile_id,
        doctor_user_id=entry.doctor_user_id,
        old_values=old_values,
        new_values=new_values
    )
    
    return entry_with_relationships


def update_waitlist_entry_status(
    entry_id: int,
    new_status: WaitlistStatus,
    updated_by_user_id: int,
    db: Session
) -> WaitlistEntry:
    """
    Update the status of a waitlist entry.
    
    Args:
        entry_id: ID of the waitlist entry
        new_status: New status to set
        updated_by_user_id: ID of the user updating the status
        db: Database session
        
    Returns:
        Updated WaitlistEntry
        
    Raises:
        HTTPException: If entry not found or invalid status transition
    """
    # Validate entry exists
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    old_status = entry.status
    
    # Validate status transition
    valid_transitions = {
        WaitlistStatus.PENDING: [WaitlistStatus.INVITED, WaitlistStatus.BOOKED, WaitlistStatus.CANCELLED, WaitlistStatus.EXPIRED],
        WaitlistStatus.INVITED: [WaitlistStatus.BOOKED, WaitlistStatus.CANCELLED, WaitlistStatus.EXPIRED],
        WaitlistStatus.BOOKED: [],  # Terminal state
        WaitlistStatus.CANCELLED: [],  # Terminal state
        WaitlistStatus.EXPIRED: [WaitlistStatus.CANCELLED]  # Can cancel an expired entry
    }
    
    if new_status not in valid_transitions.get(old_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {old_status.value} to {new_status.value}"
        )
    
    # Update status
    entry.status = new_status
    entry.updated_at = datetime.utcnow()
    entry.updated_by_user_id = updated_by_user_id
    
    db.commit()
    db.refresh(entry)
    
    # Log audit event for status change
    log_waitlist_audit_event(
        action="update_status",
        user_id=updated_by_user_id,
        entry_id=entry_id,
        patient_profile_id=entry.patient_profile_id,
        doctor_user_id=entry.doctor_user_id,
        old_values={"status": old_status.value},
        new_values={"status": new_status.value}
    )
    
    # Reload with relationships
    entry_with_relationships = db.query(WaitlistEntry).options(
        joinedload(WaitlistEntry.patient).joinedload(PatientProfile.user),
        joinedload(WaitlistEntry.doctor),
        joinedload(WaitlistEntry.created_by),
        joinedload(WaitlistEntry.updated_by)
    ).filter(WaitlistEntry.id == entry.id).first()
    
    return entry_with_relationships


def remove_waitlist_entry(
    entry_id: int,
    updated_by_user_id: int,
    db: Session
) -> bool:
    """
    Remove a waitlist entry by setting its status to CANCELLED.
    
    Args:
        entry_id: ID of the waitlist entry
        updated_by_user_id: ID of the user removing the entry
        db: Database session
        
    Returns:
        True if successful
        
    Raises:
        HTTPException: If entry not found
    """
    # Validate entry exists
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    # Set status to CANCELLED
    old_status = entry.status
    entry.status = WaitlistStatus.CANCELLED
    entry.updated_at = datetime.utcnow()
    entry.updated_by_user_id = updated_by_user_id
    
    db.commit()
    
    # Log audit event for entry deletion
    log_waitlist_audit_event(
        action="delete_entry",
        user_id=updated_by_user_id,
        entry_id=entry_id,
        patient_profile_id=entry.patient_profile_id,
        doctor_user_id=entry.doctor_user_id,
        old_values={"status": old_status.value},
        new_values={"status": WaitlistStatus.CANCELLED.value}
    )
    
    return True


def expire_old_entries(db: Session) -> int:
    """
    Background job function to expire old waitlist entries.
    Queries entries where expiry_date < today AND status = PENDING,
    then updates their status to EXPIRED.
    
    Args:
        db: Database session
        
    Returns:
        Count of expired entries
    """
    today = date.today()
    
    # Query entries where expiry_date < today AND status = PENDING
    expired_entries = db.query(WaitlistEntry).filter(
        and_(
            WaitlistEntry.expiry_date < today,
            WaitlistEntry.status == WaitlistStatus.PENDING
        )
    ).all()
    
    count = len(expired_entries)
    
    # Update status to EXPIRED
    for entry in expired_entries:
        entry.status = WaitlistStatus.EXPIRED
        entry.updated_at = datetime.utcnow()
        # Note: updated_by_user_id is left as None for system-automated expiry
        
        # Log audit event for each expired entry
        log_waitlist_audit_event(
            action="expire_entry",
            user_id=None,  # System action
            entry_id=entry.id,
            patient_profile_id=entry.patient_profile_id,
            doctor_user_id=entry.doctor_user_id,
            old_values={"status": WaitlistStatus.PENDING.value},
            new_values={"status": WaitlistStatus.EXPIRED.value},
            additional_data={"expiry_date": entry.expiry_date.isoformat()}
        )
    
    if count > 0:
        db.commit()
    
    return count
