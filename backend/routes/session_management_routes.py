"""
Unified API routes for appointment session management.
Clean, scalable interface with single session object.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from models.appointment_session_model import AppointmentSession, SessionStatus, SessionType
from services.session_management_service import SessionManagementService, SessionCreate
from services.session_recurrence_service import (
    SessionRecurrencePatternResponse,
    SessionResponse
)

router = APIRouter(prefix="/sessions", tags=["Session Management"])


@router.post(
    "/",
    response_model=SessionRecurrencePatternResponse,
    summary="Create appointment session pattern",
    status_code=201
)
def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create appointment sessions with a unified, clean interface.
    
    The system automatically detects whether you're creating a simple weekly pattern
    or an advanced recurrence pattern based on the fields you provide.
    
    ---
    
    ## Simple Weekly Pattern
    
    For regular weekly schedules on a single day:
    
    **Required fields:**
    - `name`: Session name
    - `day_of_week`: Day name (Monday, Tuesday, etc.)
    - `start_time`: Session start time (HH:MM)
    - `end_time`: Session end time (HH:MM)
    - `session_type`: "on_site" or "off_site"
    
    **Optional:**
    - `duration_weeks`: Number of weeks (default: 8)
    - `slots`: Array of slots to create in each session
    
    **Example:**
    ```json
    {
      "name": "Monday Morning Clinic",
      "day_of_week": "Monday",
      "start_time": "09:00",
      "end_time": "17:00",
      "session_type": "on_site",
      "duration_weeks": 12
    }
    ```
    
    This creates sessions every Monday for 12 weeks.
    
    ---
    
    ## Advanced Recurrence Pattern
    
    For complex schedules (multiple days, monthly patterns, etc.):
    
    **Required fields:**
    - `name`: Session name
    - `start_time`: Session start time (HH:MM)
    - `end_time`: Session end time (HH:MM)
    - `session_type`: "on_site" or "off_site"
    - `recurrence_config`: Recurrence configuration object
    
    **Optional:**
    - `slots`: Array of slots to create in each session
    
    ### Daily Pattern Example:
    ```json
    {
      "name": "Daily Walk-in Clinic",
      "start_time": "09:00",
      "end_time": "17:00",
      "session_type": "on_site",
      "recurrence_config": {
        "duration": "daily",
        "start_date": "2025-10-21",
        "end_date": "2025-12-31",
        "selected_option": "on_day"
      }
    }
    ```
    
    ### Weekly Pattern (Multiple Days) Example:
    ```json
    {
      "name": "Mon/Wed/Fri Clinic",
      "start_time": "09:00",
      "end_time": "17:00",
      "session_type": "on_site",
      "recurrence_config": {
        "duration": "weekly",
        "start_date": "2025-10-21",
        "end_date": "2026-10-21",
        "selected_option": "on_day",
        "selected_days": ["Mon", "Wed", "Fri"]
      }
    }
    ```
    
    ### Monthly Pattern (Specific Dates) Example:
    ```json
    {
      "name": "1st & 15th Clinic",
      "start_time": "09:00",
      "end_time": "17:00",
      "session_type": "on_site",
      "recurrence_config": {
        "duration": "monthly",
        "start_date": "2025-10-21",
        "end_date": "2026-10-21",
        "selected_option": "on_date",
        "month_days": [1, 15]
      }
    }
    ```
    
    ### Monthly Pattern (Specific Weekday) Example:
    ```json
    {
      "name": "First Monday Clinic",
      "start_time": "10:00",
      "end_time": "14:00",
      "session_type": "on_site",
      "recurrence_config": {
        "duration": "monthly",
        "start_date": "2025-10-21",
        "end_date": "2026-10-21",
        "selected_option": "on_day",
        "week": "first",
        "week_day": "Mon"
      }
    }
    ```
    
    ---
    
    ## Adding Nested Slots (Optional)
    
    Include a `slots` array to automatically create appointment slots within each session.
    Slots will be created for **every session** in the pattern.
    
    **Example with slots:**
    ```json
    {
      "name": "Monday Clinic",
      "day_of_week": "Monday",
      "start_time": "09:00",
      "end_time": "17:00",
      "session_type": "on_site",
      "duration_weeks": 8,
      "slots": [
        {
          "start_time": "09:00",
          "end_time": "09:30",
          "duration": 30,
          "title": "Consultation",
          "slot_type": "clinical",
          "modality": "face_to_face",
          "slot_color": "#4CAF50"
        },
        {
          "start_time": "09:30",
          "end_time": "10:00",
          "duration": 30,
          "title": "Follow-up",
          "slot_type": "clinical",
          "modality": "telephone"
        },
        {
          "start_time": "10:00",
          "end_time": "10:15",
          "duration": 15,
          "title": "Break",
          "slot_type": "break"
        }
      ]
    }
    ```
    
    **Slot Types:**
    - `clinical` - Patient appointments (requires modality)
    - `clinicalAdmin` - Administrative clinical tasks
    - `break` - Break time
    - `unallocated` - Unassigned time
    
    **Clinical Modalities:**
    - `face_to_face` - In-person
    - `home_visit` - Home visit
    - `telephone` - Phone call
    
    ---
    
    ## Response
    
    Returns the created pattern with:
    - Pattern details
    - Unique `recurrence_group_id`
    - Count of sessions generated
    
    **Response Example:**
    ```json
    {
      "id": 1,
      "recurrence_group_id": "recur_abc123def456",
      "name": "Monday Morning Clinic",
      "session_type": "on_site",
      "start_time_of_day": "09:00",
      "end_time_of_day": "17:00",
      "recurrence_config": {...},
      "is_active": true,
      "created_at": "2025-10-22T10:00:00Z",
      "sessions_generated_count": 12
    }
    ```
    """
    # Create the session pattern
    pattern = SessionManagementService.create_session(
        db=db,
        doctor_user_id=current_user.id,
        session_data=session_data
    )
    
    # Count generated sessions
    sessions_count = db.query(AppointmentSession).filter(
        AppointmentSession.recurrence_group_id == pattern.recurrence_group_id
    ).count()
    
    # Build response
    response = SessionRecurrencePatternResponse.from_orm(pattern)
    response.sessions_generated_count = sessions_count
    
    return response


@router.get(
    "/patterns",
    response_model=List[SessionRecurrencePatternResponse],
    summary="Get all session patterns for current doctor"
)
def get_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all session patterns created by the current doctor.
    
    Returns both simple weekly and advanced recurrence patterns.
    """
    patterns = SessionManagementService.get_doctor_patterns(db, current_user.id)
    
    # Add session counts to each pattern
    response_patterns = []
    for pattern in patterns:
        pattern_response = SessionRecurrencePatternResponse.from_orm(pattern)
        pattern_response.sessions_generated_count = db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == pattern.recurrence_group_id
        ).count()
        response_patterns.append(pattern_response)
    
    return response_patterns


@router.get(
    "/patterns/{recurrence_group_id}/sessions",
    response_model=List[SessionResponse],
    summary="Get all sessions for a specific pattern"
)
def get_pattern_sessions(
    recurrence_group_id: str,
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all generated sessions for a specific pattern.
    
    **Parameters:**
    - `recurrence_group_id`: Unique identifier for the pattern
    - `start_date` (optional): Filter sessions from this date
    - `end_date` (optional): Filter sessions until this date
    
    **Example:**
    ```
    GET /sessions/patterns/recur_abc123def456/sessions?start_date=2025-10-01&end_date=2025-10-31
    ```
    """
    start_dt = datetime.strptime(start_date, '%Y-%m-%d') if start_date else None
    end_dt = datetime.strptime(end_date, '%Y-%m-%d') if end_date else None
    
    sessions = SessionManagementService.get_pattern_sessions(
        db=db,
        recurrence_group_id=recurrence_group_id,
        start_date=start_dt,
        end_date=end_dt
    )
    
    return [SessionResponse.from_orm(session) for session in sessions]


@router.delete(
    "/patterns/{recurrence_group_id}",
    summary="Delete a session pattern and all its sessions"
)
def delete_pattern(
    recurrence_group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a session pattern and all its generated sessions.
    
    **Note:** This will fail if any sessions have booked appointments.
    Cancel appointments first before deleting the pattern.
    
    **Parameters:**
    - `recurrence_group_id`: Unique identifier for the pattern
    
    **Example:**
    ```
    DELETE /sessions/patterns/recur_abc123def456
    ```
    
    **Success Response:**
    ```json
    {
      "message": "Pattern and sessions deleted successfully"
    }
    ```
    
    **Error Response (if sessions are booked):**
    ```json
    {
      "detail": "Cannot delete pattern with 5 booked sessions"
    }
    ```
    """
    return SessionManagementService.delete_pattern(
        db=db,
        recurrence_group_id=recurrence_group_id,
        doctor_user_id=current_user.id
    )


@router.get(
    "/available",
    response_model=List[SessionResponse],
    summary="Get available sessions for booking"
)
def get_available_sessions(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    session_type: Optional[str] = Query(None, description="Filter by type: on_site or off_site"),
    start_date: Optional[str] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get all available sessions for booking.
    
    **Filters:**
    - `doctor_id`: Show only sessions for a specific doctor
    - `session_type`: Filter by "on_site" or "off_site"
    - `start_date`: Show sessions from this date onwards
    - `end_date`: Show sessions until this date
    
    **Example:**
    ```
    GET /sessions/available?doctor_id=5&session_type=on_site&start_date=2025-10-21&end_date=2025-10-31
    ```
    
    **Use cases:**
    - Patient booking interface
    - Finding next available appointment
    - Checking doctor availability
    
    **Returns:** List of available sessions (status = "Available")
    """
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
    
    sessions = query.order_by(AppointmentSession.start_time).limit(100).all()
    
    return [SessionResponse.from_orm(session) for session in sessions]
