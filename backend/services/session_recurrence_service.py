"""
Service for handling appointment slot recurrence logic.
Generates slots based on recurrence patterns with support for daily, weekly, and monthly patterns.
"""

from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid
from calendar import monthrange

from models.appointment_session_model import (
    AppointmentSession,
    SessionRecurrencePattern,
    SessionType,
    SessionStatus,
    RecurrenceDuration,
    RecurrenceOption
)
from pydantic import BaseModel, Field, validator
from fastapi import HTTPException


# Pydantic models for API
class RecurrenceConfig(BaseModel):
    """Configuration for slot recurrence"""
    duration: str = Field(..., description="Recurrence frequency: daily, weekly, monthly")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    repeat_count: Optional[int] = Field(None, description="Number of times to repeat")
    selected_option: str = Field(..., description="on_day or on_date")
    selected_days: Optional[List[str]] = Field(None, description="Days of week: Mon, Tue, etc.")
    month_days: Optional[List[int]] = Field(None, description="Days of month: 1-31")
    week: Optional[str] = Field(None, description="Week of month: first, second, third, fourth, last")
    week_day: Optional[str] = Field(None, description="Day of week for monthly recurrence")

    @validator('duration')
    def validate_duration(cls, v):
        valid = ['daily', 'weekly', 'monthly']
        if v not in valid:
            raise ValueError(f"Duration must be one of {valid}")
        return v

    @validator('selected_option')
    def validate_option(cls, v):
        valid = ['on_day', 'on_date']
        if v not in valid:
            raise ValueError(f"Selected option must be one of {valid}")
        return v


class SessionRecurrencePatternCreate(BaseModel):
    """Request model for creating a recurrence pattern"""
    name: str = Field(..., description="Name of the slot pattern")
    session_type: str = Field(..., description="on_site or off_site")
    start_time_of_day: str = Field(..., description="Start time in HH:MM format")
    end_time_of_day: str = Field(..., description="End time in HH:MM format")
    recurrence_config: RecurrenceConfig


class SessionRecurrencePatternResponse(BaseModel):
    """Response model for recurrence pattern"""
    id: int
    recurrence_group_id: str
    name: str
    session_type: str
    start_time_of_day: str
    end_time_of_day: str
    recurrence_config: Dict[str, Any]
    is_active: bool
    created_at: datetime
    sessions_generated_count: Optional[int] = None

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    """Response model for individual slot"""
    id: int
    doctor_user_id: int
    name: str
    session_type: str
    start_time: datetime
    end_time: datetime
    status: str
    is_recurring: bool
    recurrence_group_id: Optional[str]

    class Config:
        from_attributes = True


# Day of week mapping - supports both short and full names
DAY_MAPPING = {
    "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6,
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, 
    "Friday": 4, "Saturday": 5, "Sunday": 6
}

WEEK_MAPPING = {
    "first": 0, "second": 1, "third": 2, "fourth": 3, "last": -1
}


class SessionRecurrenceService:
    """Service class for managing slot recurrence"""

    @staticmethod
    def create_recurrence_pattern(
        db: Session,
        doctor_user_id: int,
        pattern_data: SessionRecurrencePatternCreate
    ) -> SessionRecurrencePattern:
        """
        Create a new recurrence pattern and generate initial slots.
        """
        # Generate unique group ID
        recurrence_group_id = f"recur_{uuid.uuid4().hex[:12]}"

        # Validate time format
        try:
            time.fromisoformat(pattern_data.start_time_of_day)
            time.fromisoformat(pattern_data.end_time_of_day)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

        # Create pattern
        pattern = SessionRecurrencePattern(
            doctor_user_id=doctor_user_id,
            recurrence_group_id=recurrence_group_id,
            name=pattern_data.name,
            session_type=SessionType(pattern_data.session_type),
            recurrence_config=pattern_data.recurrence_config.dict(),
            start_time_of_day=pattern_data.start_time_of_day,
            end_time_of_day=pattern_data.end_time_of_day,
            is_active=True
        )

        db.add(pattern)
        db.flush()  # Get the ID

        # Generate slots based on pattern
        slots = SessionRecurrenceService._generate_slots_from_pattern(pattern)
        
        for slot in slots:
            db.add(slot)

        pattern.last_generated_date = datetime.utcnow()
        db.commit()
        db.refresh(pattern)

        return pattern

    @staticmethod
    def _generate_slots_from_pattern(pattern: SessionRecurrencePattern) -> List[AppointmentSession]:
        """
        Generate appointment slots based on recurrence pattern.
        """
        config = pattern.recurrence_config
        slots = []

        # Parse dates
        start_date = datetime.strptime(config['start_date'], '%Y-%m-%d').date()
        end_date = None
        if config.get('end_date'):
            end_date = datetime.strptime(config['end_date'], '%Y-%m-%d').date()

        # Parse times
        start_time = time.fromisoformat(pattern.start_time_of_day)
        end_time = time.fromisoformat(pattern.end_time_of_day)

        duration = config['duration']

        if duration == 'daily':
            slots = SessionRecurrenceService._generate_daily_slots(
                pattern, start_date, end_date, start_time, end_time, config
            )
        elif duration == 'weekly':
            slots = SessionRecurrenceService._generate_weekly_slots(
                pattern, start_date, end_date, start_time, end_time, config
            )
        elif duration == 'monthly':
            slots = SessionRecurrenceService._generate_monthly_slots(
                pattern, start_date, end_date, start_time, end_time, config
            )

        return slots

    @staticmethod
    def _generate_daily_slots(
        pattern: SessionRecurrencePattern,
        start_date,
        end_date,
        start_time,
        end_time,
        config: Dict
    ) -> List[AppointmentSession]:
        """Generate daily recurring slots"""
        slots = []
        current_date = start_date
        repeat_count = config.get('repeat_count', 0)
        count = 0

        # If no end_date and no repeat_count, default to 1 year
        if not end_date and not repeat_count:
            end_date = start_date + timedelta(days=365)

        while True:
            # Check end conditions
            if end_date and current_date > end_date:
                break
            if repeat_count and count >= repeat_count:
                break

            # Create slot for this date
            slot_start = datetime.combine(current_date, start_time)
            slot_end = datetime.combine(current_date, end_time)

            slot = AppointmentSession(
                doctor_user_id=pattern.doctor_user_id,
                name=pattern.name,
                session_type=pattern.session_type,
                start_time=slot_start,
                end_time=slot_end,
                status=SessionStatus.AVAILABLE,
                is_recurring=True,
                recurrence_group_id=pattern.recurrence_group_id
            )
            slots.append(slot)

            current_date += timedelta(days=1)
            count += 1

            # Safety limit
            if count > 365 * 2:
                break

        return slots

    @staticmethod
    def _generate_weekly_slots(
        pattern: SessionRecurrencePattern,
        start_date,
        end_date,
        start_time,
        end_time,
        config: Dict
    ) -> List[AppointmentSession]:
        """Generate weekly recurring slots on specific days"""
        slots = []
        selected_days = config.get('selected_days', [])
        
        if not selected_days:
            raise HTTPException(status_code=400, detail="selected_days required for weekly recurrence")

        # Convert day names to weekday numbers
        target_weekdays = [DAY_MAPPING[day] for day in selected_days if day in DAY_MAPPING]

        current_date = start_date
        repeat_count = config.get('repeat_count', 0)
        count = 0
        days_checked = 0
        max_days = 365 * 2  # Safety limit: 2 years max

        # If no end_date and no repeat_count, default to 1 year
        if not end_date and not repeat_count:
            end_date = start_date + timedelta(days=365)

        while True:
            # Check end conditions
            if end_date and current_date > end_date:
                break
            if repeat_count and count >= repeat_count:
                break
            if days_checked >= max_days:
                break

            # Check if current day is in selected days
            if current_date.weekday() in target_weekdays:
                slot_start = datetime.combine(current_date, start_time)
                slot_end = datetime.combine(current_date, end_time)

                slot = AppointmentSession(
                    doctor_user_id=pattern.doctor_user_id,
                    name=pattern.name,
                    session_type=pattern.session_type,
                    start_time=slot_start,
                    end_time=slot_end,
                    status=SessionStatus.AVAILABLE,
                    is_recurring=True,
                    recurrence_group_id=pattern.recurrence_group_id
                )
                slots.append(slot)
                count += 1

            current_date += timedelta(days=1)
            days_checked += 1

            # Safety limit
            if len(slots) > 500:
                break

        return slots

    @staticmethod
    def _generate_monthly_slots(
        pattern: SessionRecurrencePattern,
        start_date,
        end_date,
        start_time,
        end_time,
        config: Dict
    ) -> List[AppointmentSession]:
        """Generate monthly recurring slots"""
        slots = []
        selected_option = config.get('selected_option')

        if selected_option == 'on_date':
            # Recur on specific dates of the month
            month_days = config.get('month_days', [])
            if not month_days:
                raise HTTPException(status_code=400, detail="month_days required for monthly on_date recurrence")

            slots = SessionRecurrenceService._generate_monthly_on_date(
                pattern, start_date, end_date, start_time, end_time, month_days, config
            )
        elif selected_option == 'on_day':
            # Recur on specific week and day (e.g., first Monday)
            week = config.get('week')
            week_day = config.get('week_day')
            
            if not week or not week_day:
                raise HTTPException(status_code=400, detail="week and week_day required for monthly on_day recurrence")

            slots = SessionRecurrenceService._generate_monthly_on_day(
                pattern, start_date, end_date, start_time, end_time, week, week_day, config
            )

        return slots

    @staticmethod
    def _generate_monthly_on_date(
        pattern: SessionRecurrencePattern,
        start_date,
        end_date,
        start_time,
        end_time,
        month_days: List[int],
        config: Dict
    ) -> List[AppointmentSession]:
        """Generate slots on specific dates of each month"""
        slots = []
        current_date = start_date.replace(day=1)  # Start from first of month
        repeat_count = config.get('repeat_count', 0)
        count = 0

        while True:
            if end_date and current_date > end_date:
                break
            if repeat_count and count >= repeat_count:
                break

            # Get days in current month
            _, days_in_month = monthrange(current_date.year, current_date.month)

            for day in month_days:
                if day > days_in_month:
                    continue  # Skip invalid dates

                slot_date = current_date.replace(day=day)
                
                # Skip if before start date
                if slot_date < start_date:
                    continue
                if end_date and slot_date > end_date:
                    continue

                slot_start = datetime.combine(slot_date, start_time)
                slot_end = datetime.combine(slot_date, end_time)

                slot = AppointmentSession(
                    doctor_user_id=pattern.doctor_user_id,
                    name=pattern.name,
                    session_type=pattern.session_type,
                    start_time=slot_start,
                    end_time=slot_end,
                    status=SessionStatus.AVAILABLE,
                    is_recurring=True,
                    recurrence_group_id=pattern.recurrence_group_id
                )
                slots.append(slot)
                count += 1

            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

            # Safety limit
            if len(slots) > 500:
                break

        return slots

    @staticmethod
    def _generate_monthly_on_day(
        pattern: SessionRecurrencePattern,
        start_date,
        end_date,
        start_time,
        end_time,
        week: str,
        week_day: str,
        config: Dict
    ) -> List[AppointmentSession]:
        """Generate slots on specific week and day of each month (e.g., first Monday)"""
        slots = []
        current_date = start_date.replace(day=1)
        repeat_count = config.get('repeat_count', 0)
        count = 0

        target_weekday = DAY_MAPPING.get(week_day)
        if target_weekday is None:
            raise HTTPException(status_code=400, detail=f"Invalid week_day: {week_day}")

        week_index = WEEK_MAPPING.get(week)
        if week_index is None:
            raise HTTPException(status_code=400, detail=f"Invalid week: {week}")

        while True:
            if end_date and current_date > end_date:
                break
            if repeat_count and count >= repeat_count:
                break

            # Find the target day in current month
            slot_date = SessionRecurrenceService._find_weekday_in_month(
                current_date.year, current_date.month, target_weekday, week_index
            )

            if slot_date:
                # Skip if before start date
                if slot_date < start_date:
                    pass
                elif end_date and slot_date > end_date:
                    pass
                else:
                    slot_start = datetime.combine(slot_date, start_time)
                    slot_end = datetime.combine(slot_date, end_time)

                    slot = AppointmentSession(
                        doctor_user_id=pattern.doctor_user_id,
                        name=pattern.name,
                        session_type=pattern.session_type,
                        start_time=slot_start,
                        end_time=slot_end,
                        status=SessionStatus.AVAILABLE,
                        is_recurring=True,
                        recurrence_group_id=pattern.recurrence_group_id
                    )
                    slots.append(slot)
                    count += 1

            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

            # Safety limit
            if len(slots) > 500:
                break

        return slots

    @staticmethod
    def _find_weekday_in_month(year: int, month: int, weekday: int, week_index: int):
        """
        Find the Nth occurrence of a weekday in a month.
        week_index: 0=first, 1=second, 2=third, 3=fourth, -1=last
        """
        first_day = datetime(year, month, 1).date()
        _, days_in_month = monthrange(year, month)

        # Find all occurrences of the target weekday
        occurrences = []
        for day in range(1, days_in_month + 1):
            date = datetime(year, month, day).date()
            if date.weekday() == weekday:
                occurrences.append(date)

        if not occurrences:
            return None

        # Return the requested occurrence
        if week_index == -1:
            return occurrences[-1]
        elif 0 <= week_index < len(occurrences):
            return occurrences[week_index]
        else:
            return None

    @staticmethod
    def get_patterns_by_doctor(db: Session, doctor_user_id: int) -> List[SessionRecurrencePattern]:
        """Get all recurrence patterns for a doctor"""
        return db.query(SessionRecurrencePattern).filter(
            SessionRecurrencePattern.doctor_user_id == doctor_user_id
        ).all()

    @staticmethod
    def get_sessions_by_pattern(
        db: Session,
        recurrence_group_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AppointmentSession]:
        """Get all slots for a specific recurrence pattern"""
        query = db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == recurrence_group_id
        )

        if start_date:
            query = query.filter(AppointmentSession.start_time >= start_date)
        if end_date:
            query = query.filter(AppointmentSession.start_time <= end_date)

        return query.order_by(AppointmentSession.start_time).all()

    @staticmethod
    def delete_pattern_and_sessions(db: Session, recurrence_group_id: str, doctor_user_id: int):
        """Delete a recurrence pattern and all its generated slots"""
        # Verify ownership
        pattern = db.query(SessionRecurrencePattern).filter(
            and_(
                SessionRecurrencePattern.recurrence_group_id == recurrence_group_id,
                SessionRecurrencePattern.doctor_user_id == doctor_user_id
            )
        ).first()

        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        # Delete all slots (only if not booked)
        slots = db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == recurrence_group_id
        ).all()

        booked_count = sum(1 for slot in slots if slot.status == SessionStatus.BOOKED)
        if booked_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete pattern with {booked_count} booked slots"
            )

        # Delete slots and pattern
        db.query(AppointmentSession).filter(
            AppointmentSession.recurrence_group_id == recurrence_group_id
        ).delete()
        db.delete(pattern)
        db.commit()

        return {"message": "Pattern and slots deleted successfully"}
