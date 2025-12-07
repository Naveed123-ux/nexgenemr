"""
Unified session management service with clean, scalable architecture.
Single schema handles both simple and advanced recurrence patterns.
"""

from datetime import datetime, timedelta, date, time
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator, model_validator
import uuid

from models.appointment_session_model import (
    AppointmentSession,
    SessionRecurrencePattern,
    SessionType,
    SessionStatus
)
from services.session_recurrence_service import SessionRecurrenceService, RecurrenceConfig
from fastapi import HTTPException


class SlotData(BaseModel):
    """Schema for nested slot creation"""
    start_time: str = Field(..., description="Slot start time (HH:MM:SS or full datetime)")
    end_time: str = Field(..., description="Slot end time (HH:MM:SS or full datetime)")
    duration: int = Field(..., ge=5, description="Duration in minutes")
    title: Optional[str] = Field(None, description="Slot title")
    label: Optional[str] = Field(None, description="Slot label")
    slot_color: Optional[str] = Field(None, description="Hex color code")
    slot_type: str = Field("clinical", description="clinical, clinicalAdmin, break, unallocated")
    modality: Optional[str] = Field(None, description="face_to_face, home_visit, telephone")
    is_blocked: bool = Field(False, description="Whether slot is blocked")


class SessionCreate(BaseModel):
    """
    Unified session creation schema.
    Automatically detects simple vs advanced patterns based on fields provided.
    
    For Simple Weekly Pattern:
    - Provide: name, day_of_week, start_time, end_time, session_type
    - Optional: duration_weeks (default: 8)
    
    For Advanced Recurrence Pattern:
    - Provide: name, session_type, start_time, end_time, recurrence_config
    """
    
    # Common required fields
    name: str = Field(..., description="Session name (e.g., 'Monday Morning Clinic')")
    session_type: str = Field(..., description="'on_site' or 'off_site'")
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")
    
    # Simple weekly pattern fields (optional)
    day_of_week: Optional[str] = Field(
        None, 
        description="Day name: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday"
    )
    duration_weeks: Optional[int] = Field(
        None,
        ge=1,
        le=52,
        description="Number of weeks to generate (1-52, default: 8)"
    )
    
    # Advanced recurrence pattern fields (optional)
    recurrence_config: Optional[RecurrenceConfig] = Field(
        None,
        description="Recurrence configuration for advanced patterns"
    )
    
    # Optional nested slots
    slots: Optional[List[SlotData]] = Field(
        None,
        description="Optional slots to create within each session"
    )
    
    @field_validator('session_type')
    @classmethod
    def validate_session_type(cls, v):
        """Validate session type"""
        if v not in ['on_site', 'off_site']:
            raise ValueError("session_type must be 'on_site' or 'off_site'")
        return v
    
    @field_validator('day_of_week')
    @classmethod
    def validate_day_of_week(cls, v):
        """Validate day of week if provided"""
        if v is None:
            return v
        valid_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        if v not in valid_days:
            raise ValueError(f"day_of_week must be one of {valid_days}")
        return v
    
    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_time_format(cls, v):
        """Validate time format"""
        try:
            time.fromisoformat(v)
        except ValueError:
            raise ValueError("Time must be in HH:MM format (e.g., '09:00')")
        return v
    
    @model_validator(mode='after')
    def validate_pattern_fields(self):
        """
        Validate that either simple or advanced pattern fields are provided, not both.
        Also set defaults and ensure consistency.
        """
        # Detect pattern type
        has_simple_fields = self.day_of_week is not None
        has_advanced_fields = self.recurrence_config is not None
        
        # Validate mutually exclusive patterns
        if has_simple_fields and has_advanced_fields:
            raise ValueError(
                "Cannot specify both simple pattern fields (day_of_week) and "
                "advanced pattern fields (recurrence_config). Choose one approach."
            )
        
        if not has_simple_fields and not has_advanced_fields:
            raise ValueError(
                "Must specify either simple pattern (day_of_week) or "
                "advanced pattern (recurrence_config)"
            )
        
        # Set default duration_weeks for simple patterns
        if has_simple_fields and self.duration_weeks is None:
            self.duration_weeks = 8
        
        # Validate start_time < end_time
        if self.start_time and self.end_time:
            start_t = time.fromisoformat(self.start_time)
            end_t = time.fromisoformat(self.end_time)
            if start_t >= end_t:
                raise ValueError("start_time must be before end_time")
        
        return self
    
    def is_simple_pattern(self) -> bool:
        """Check if this is a simple weekly pattern"""
        return self.day_of_week is not None
    
    def is_advanced_pattern(self) -> bool:
        """Check if this is an advanced recurrence pattern"""
        return self.recurrence_config is not None


class SessionManagementService:
    """Service for managing appointment sessions with unified interface"""
    
    # Day name to short code mapping
    DAY_TO_CODE = {
        "Monday": "Mon",
        "Tuesday": "Tue",
        "Wednesday": "Wed",
        "Thursday": "Thu",
        "Friday": "Fri",
        "Saturday": "Sat",
        "Sunday": "Sun"
    }
    
    @staticmethod
    def create_session(
        db: Session,
        doctor_user_id: int,
        session_data: SessionCreate
    ) -> SessionRecurrencePattern:
        """
        Create a session pattern - automatically handles simple or advanced patterns.
        
        Args:
            db: Database session
            doctor_user_id: ID of the doctor creating the session
            session_data: Unified session creation data
            
        Returns:
            Created SessionRecurrencePattern
            
        Raises:
            HTTPException: If validation fails or creation errors occur
        """
        # Route to appropriate handler based on pattern type
        if session_data.is_simple_pattern():
            pattern = SessionManagementService._create_simple_pattern(
                db, doctor_user_id, session_data
            )
        else:
            pattern = SessionManagementService._create_advanced_pattern(
                db, doctor_user_id, session_data
            )
        
        # Create nested slots if provided
        if session_data.slots:
            SessionManagementService._create_nested_slots(
                db, pattern.recurrence_group_id, session_data.slots
            )
        
        return pattern
    
    @staticmethod
    def _create_simple_pattern(
        db: Session,
        doctor_user_id: int,
        session_data: SessionCreate
    ) -> SessionRecurrencePattern:
        """
        Create a simple weekly recurring pattern.
        Converts simple weekly schedule to a RecurrenceConfig.
        """
        # Convert day name to short code
        day_code = SessionManagementService.DAY_TO_CODE[session_data.day_of_week]
        
        # Calculate start and end dates
        today = date.today()
        day_index = list(SessionManagementService.DAY_TO_CODE.keys()).index(session_data.day_of_week)
        days_ahead = (day_index - today.weekday()) % 7
        
        # If today is the target day, start today
        start_date = today + timedelta(days=days_ahead)
        end_date = start_date + timedelta(weeks=session_data.duration_weeks)
        
        # Build recurrence config
        recurrence_config = RecurrenceConfig(
            duration="weekly",
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d'),
            repeat_count=None,
            selected_option="on_day",
            selected_days=[day_code],
            month_days=None,
            week=None,
            week_day=None
        )
        
        # Use recurrence service to create pattern
        from services.session_recurrence_service import SessionRecurrencePatternCreate
        
        pattern_data = SessionRecurrencePatternCreate(
            name=session_data.name,
            session_type=session_data.session_type,
            start_time_of_day=session_data.start_time,
            end_time_of_day=session_data.end_time,
            recurrence_config=recurrence_config
        )
        
        return SessionRecurrenceService.create_recurrence_pattern(
            db=db,
            doctor_user_id=doctor_user_id,
            pattern_data=pattern_data
        )
    
    @staticmethod
    def _create_advanced_pattern(
        db: Session,
        doctor_user_id: int,
        session_data: SessionCreate
    ) -> SessionRecurrencePattern:
        """
        Create an advanced recurring pattern with custom recurrence config.
        """
        from services.session_recurrence_service import SessionRecurrencePatternCreate
        
        pattern_data = SessionRecurrencePatternCreate(
            name=session_data.name,
            session_type=session_data.session_type,
            start_time_of_day=session_data.start_time,
            end_time_of_day=session_data.end_time,
            recurrence_config=session_data.recurrence_config
        )
        
        return SessionRecurrenceService.create_recurrence_pattern(
            db=db,
            doctor_user_id=doctor_user_id,
            pattern_data=pattern_data
        )
    
    @staticmethod
    def _create_nested_slots(
        db: Session,
        recurrence_group_id: str,
        slots_data: List[SlotData]
    ) -> None:
        """
        Create nested appointment slots for all sessions in a recurrence group.
        Applies the same slot structure to each session.
        """
        from models.appointment_slot_model import AppointmentSlot, SlotType
        
        # Get all sessions for this recurrence group
        sessions = db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == recurrence_group_id
        ).all()
        
        if not sessions:
            return
        
        # Create slots for each session
        for session in sessions:
            session_date = session.start_time.date()
            
            for slot_data in slots_data:
                # Parse slot times and combine with session date
                slot_start, slot_end = SessionManagementService._parse_slot_times(
                    slot_data.start_time,
                    slot_data.end_time,
                    session_date,
                    session.start_time,
                    session.end_time
                )
                
                # Validate slot is within session bounds
                if slot_start < session.start_time or slot_end > session.end_time:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Slot {slot_data.title or 'unnamed'} is outside session time range"
                    )
                
                # Create the slot
                new_slot = AppointmentSlot(
                    session_id=session.id,
                    start_time=slot_start,
                    end_time=slot_end,
                    duration=slot_data.duration,
                    title=slot_data.title,
                    label=slot_data.label,
                    slot_color=slot_data.slot_color,
                    slot_type=SlotType(slot_data.slot_type),
                    modality=slot_data.modality,
                    is_blocked=slot_data.is_blocked
                )
                db.add(new_slot)
        
        db.commit()
    
    @staticmethod
    def _parse_slot_times(
        start_time_str: str,
        end_time_str: str,
        session_date: date,
        session_start: datetime,
        session_end: datetime
    ) -> tuple[datetime, datetime]:
        """
        Parse slot time strings and combine with session date.
        Handles both time-only strings (HH:MM:SS) and full datetime strings.
        """
        from datetime import time as dt_time
        
        # Check if it's a full datetime string
        if 'T' in start_time_str or '-' in start_time_str:
            # Full datetime string - extract time and use session date
            slot_start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            slot_end_dt = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            
            # Combine session date with slot times
            slot_start = datetime.combine(session_date, slot_start_dt.time())
            slot_end = datetime.combine(session_date, slot_end_dt.time())
        else:
            # Time-only string (HH:MM:SS or HH:MM)
            start_time = dt_time.fromisoformat(start_time_str)
            end_time = dt_time.fromisoformat(end_time_str)
            
            slot_start = datetime.combine(session_date, start_time)
            slot_end = datetime.combine(session_date, end_time)
        
        return slot_start, slot_end
    
    @staticmethod
    def get_doctor_patterns(
        db: Session,
        doctor_user_id: int
    ) -> List[SessionRecurrencePattern]:
        """Get all session patterns for a doctor"""
        return SessionRecurrenceService.get_patterns_by_doctor(db, doctor_user_id)
    
    @staticmethod
    def get_pattern_sessions(
        db: Session,
        recurrence_group_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AppointmentSession]:
        """Get all sessions for a specific pattern"""
        return SessionRecurrenceService.get_sessions_by_pattern(
            db, recurrence_group_id, start_date, end_date
        )
    
    @staticmethod
    def delete_pattern(
        db: Session,
        recurrence_group_id: str,
        doctor_user_id: int
    ) -> Dict[str, str]:
        """Delete a pattern and all its sessions"""
        return SessionRecurrenceService.delete_pattern_and_sessions(
            db, recurrence_group_id, doctor_user_id
        )
