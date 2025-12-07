"""
API routes for appointment slot management with recurrence support
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.db import get_db
from utils.dependencies import get_current_user, require_permission
from models.user_model import User
from services.session_recurrence_service import (
    SessionRecurrenceService,
    SessionRecurrencePatternCreate,
    SessionRecurrencePatternResponse,
    SessionResponse
)

router = APIRouter(prefix="/appointment-slots", tags=["Appointment Sessions"])


@router.post(
    "/recurrence-patterns",
    response_model=SessionRecurrencePatternResponse,
    summary="Create a recurring slot pattern"
)
def create_recurrence_pattern(
    pattern_data: SessionRecurrencePatternCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new recurrence pattern and automatically generate slots.
    
    The pattern will generate slots based on the recurrence configuration:
    - **Daily**: Creates slots every day
    - **Weekly**: Creates slots on specific days of the week
    - **Monthly**: Creates slots on specific dates or week days of the month
    
    Example recurrence_config for weekly pattern:
    ```json
    {
        "duration": "weekly",
        "start_date": "2025-06-11",
        "end_date": "2026-05-21",
        "selected_option": "on_day",
        "selected_days": ["Mon", "Wed", "Fri"]
    }
    ```
    """
    pattern = SessionRecurrenceService.create_recurrence_pattern(
        db=db,
        doctor_user_id=current_user.id,
        pattern_data=pattern_data
    )
    
    # Count generated slots
    sessions_count = db.query(AppointmentSession).filter(
        AppointmentSession.recurrence_group_id == pattern.recurrence_group_id
    ).count()
    
    response = SessionRecurrencePatternResponse.from_orm(pattern)
    response.sessions_generated_count = sessions_count
    
    return response


@router.get(
    "/recurrence-patterns",
    response_model=List[SessionRecurrencePatternResponse],
    summary="Get all recurrence patterns for current doctor"
)
def get_recurrence_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all recurrence patterns created by the current doctor.
    """
    patterns = SessionRecurrenceService.get_patterns_by_doctor(db, current_user.id)
    
    # Add slot counts
    response_patterns = []
    for pattern in patterns:
        pattern_response = SessionRecurrencePatternResponse.from_orm(pattern)
        pattern_response.sessions_generated_count = db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == pattern.recurrence_group_id
        ).count()
        response_patterns.append(pattern_response)
    
    return response_patterns


@router.get(
    "/recurrence-patterns/{recurrence_group_id}/slots",
    response_model=List[SessionResponse],
    summary="Get all slots for a specific pattern"
)
def get_pattern_sessions(
    recurrence_group_id: str,
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all generated slots for a specific recurrence pattern.
    Optionally filter by date range.
    """
    start_dt = datetime.strptime(start_date, '%Y-%m-%d') if start_date else None
    end_dt = datetime.strptime(end_date, '%Y-%m-%d') if end_date else None
    
    slots = SessionRecurrenceService.get_sessions_by_pattern(
        db=db,
        recurrence_group_id=recurrence_group_id,
        start_date=start_dt,
        end_date=end_dt
    )
    
    return [SessionResponse.from_orm(slot) for slot in slots]


@router.delete(
    "/recurrence-patterns/{recurrence_group_id}",
    summary="Delete a recurrence pattern and its slots"
)
def delete_recurrence_pattern(
    recurrence_group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a recurrence pattern and all its generated slots.
    Will fail if any slots are already booked.
    """
    return SessionRecurrenceService.delete_pattern_and_sessions(
        db=db,
        recurrence_group_id=recurrence_group_id,
        doctor_user_id=current_user.id
    )


@router.get(
    "/available",
    response_model=List[SessionResponse],
    summary="Get available slots for booking"
)
def get_available_slots(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    session_type: Optional[str] = Query(None, description="Filter by slot type: on_site or off_site"),
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get all available slots for booking.
    Can be filtered by doctor, slot type, and date range.
    """
    from models.appointment_session_model import AppointmentSession, SessionStatus, SessionType
    
    query = db.query(AppointmentSession).filter(
        AppointmentSession.status == SessionStatus.AVAILABLE
    )
    
    if doctor_id:
        query = query.filter(AppointmentSession.doctor_user_id == doctor_id)
    
    if session_type:
        query = query.filter(AppointmentSession.session_type == SessionType(session_type))
    
    if start_date:
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(AppointmentSession.start_time >= start_dt)
    
    if end_date:
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        query = query.filter(AppointmentSession.start_time <= end_dt)
    
    slots = query.order_by(AppointmentSession.start_time).limit(100).all()
    
    return [SessionResponse.from_orm(slot) for slot in slots]


# Import here to avoid circular dependency
from models.appointment_session_model import AppointmentSession
