"""
API routes for managing individual appointment slots within sessions
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from models.appointment_slot_model import SlotType
from services.slot_management_service import SlotManagementService
from schemas.appointment_slot_schema import (
    SlotCreate,
    SlotUpdate,
    SlotResponse,
    SlotWithSessionInfo
)


router = APIRouter(prefix="/slots", tags=["Slot Management"])


@router.post(
    "/session/{session_id}",
    response_model=SlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a single slot within a session"
)
def create_slot(
    session_id: int,
    slot_data: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new slot within an existing session.
    
    **Validations:**
    - Slot must fit within session time range
    - Slot duration must match time range
    - Slot cannot overlap with existing slots
    - Total slot duration cannot exceed session duration
    - Minimum slot duration: 5 minutes
    """
    return SlotManagementService.create_slot(db, session_id, slot_data, current_user)


@router.post(
    "/session/{session_id}/bulk",
    response_model=List[SlotResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create multiple slots within a session"
)
def create_multiple_slots(
    session_id: int,
    slots_data: List[SlotCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create multiple slots within a session at once.
    
    **Benefits:**
    - Atomic operation (all or nothing)
    - Validates all slots before creating any
    - Checks for overlaps between new slots
    - Ensures total duration doesn't exceed session
    
    **Example:**
    ```json
    [
      {
        "start_time": "2025-10-21T09:00:00",
        "end_time": "2025-10-21T09:30:00",
        "duration": 30,
        "title": "Consultation",
        "slot_type": "clinical",
        "modality": "face_to_face"
      },
      {
        "start_time": "2025-10-21T09:30:00",
        "end_time": "2025-10-21T10:00:00",
        "duration": 30,
        "title": "Follow-up",
        "slot_type": "clinical",
        "modality": "telephone"
      }
    ]
    ```
    """
    return SlotManagementService.create_multiple_slots(db, session_id, slots_data, current_user)


@router.get(
    "/{slot_id}",
    response_model=SlotResponse,
    summary="Get a specific slot by ID"
)
def get_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific slot."""
    slot = SlotManagementService.get_slot_by_id(db, slot_id)
    if not slot:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


@router.get(
    "/session/{session_id}/all",
    response_model=List[SlotResponse],
    summary="Get all slots for a session"
)
def get_session_slots(
    session_id: int,
    include_blocked: bool = Query(True, description="Include blocked slots"),
    include_booked: bool = Query(True, description="Include booked slots"),
    slot_type: Optional[SlotType] = Query(None, description="Filter by slot type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all slots for a specific session with optional filters.
    
    **Filters:**
    - `include_blocked`: Show/hide blocked slots
    - `include_booked`: Show/hide booked slots
    - `slot_type`: Filter by type (clinical, clinicalAdmin, break, unallocated)
    """
    return SlotManagementService.get_session_slots(
        db, session_id, include_blocked, include_booked, slot_type
    )


@router.get(
    "/available",
    response_model=List[SlotResponse],
    summary="Get available slots for booking"
)
def get_available_slots(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    start_date: Optional[datetime] = Query(None, description="Filter from this date/time"),
    end_date: Optional[datetime] = Query(None, description="Filter until this date/time"),
    slot_type: Optional[SlotType] = Query(None, description="Filter by slot type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all available slots (not blocked, not booked) across all sessions.
    
    **Use cases:**
    - Patient booking interface
    - Finding next available appointment
    - Checking doctor availability
    
    **Filters:**
    - `doctor_id`: Specific doctor's slots
    - `start_date`: Slots starting from this date
    - `end_date`: Slots until this date
    - `slot_type`: Only clinical, admin, etc.
    """
    return SlotManagementService.get_available_slots(
        db, doctor_id, start_date, end_date, slot_type
    )


@router.put(
    "/{slot_id}",
    response_model=SlotResponse,
    summary="Update a slot"
)
def update_slot(
    slot_id: int,
    slot_data: SlotUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing slot.
    
    **Restrictions:**
    - Cannot update a booked slot
    - Must own the session
    - Updated times must still fit within session
    - Cannot create overlaps with other slots
    """
    return SlotManagementService.update_slot(db, slot_id, slot_data, current_user)


@router.delete(
    "/{slot_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a slot"
)
def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a slot.
    
    **Restrictions:**
    - Cannot delete a booked slot (cancel appointment first)
    - Must own the session
    """
    return SlotManagementService.delete_slot(db, slot_id, current_user)


@router.post(
    "/{slot_id}/block",
    response_model=SlotResponse,
    summary="Block a slot"
)
def block_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Block a slot to prevent it from being booked.
    
    **Use cases:**
    - Doctor taking a break
    - Slot reserved for specific purpose
    - Temporary unavailability
    
    **Restrictions:**
    - Cannot block an already booked slot
    """
    return SlotManagementService.block_slot(db, slot_id, current_user)


@router.post(
    "/{slot_id}/unblock",
    response_model=SlotResponse,
    summary="Unblock a slot"
)
def unblock_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unblock a slot to make it available for booking again.
    """
    return SlotManagementService.unblock_slot(db, slot_id, current_user)


@router.get(
    "/doctor/me",
    response_model=List[SlotResponse],
    summary="Get all my slots as a doctor"
)
def get_my_slots(
    start_date: Optional[datetime] = Query(None, description="Filter from this date/time"),
    end_date: Optional[datetime] = Query(None, description="Filter until this date/time"),
    include_blocked: bool = Query(True, description="Include blocked slots"),
    include_booked: bool = Query(True, description="Include booked slots"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all slots for the currently logged-in doctor across all their sessions.
    """
    return SlotManagementService.get_available_slots(
        db, 
        doctor_id=current_user.id,
        start_date=start_date,
        end_date=end_date
    )
