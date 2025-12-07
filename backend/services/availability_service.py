from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List
from datetime import time, date, timedelta
import uuid

from db.db import get_db
from models.user_model import User
from models.availability_template_model import AvailabilityTemplate
from models.appointment_session_model import SessionRecurrencePattern, SessionType, AppointmentSession, SessionStatus

class AvailabilitySlot(BaseModel):
    day_of_week: str
    start_time: time
    end_time: time
    slot_duration_minutes: int = 20
    is_telemedicine: bool = False

class AvailabilityTemplateCreate(BaseModel):
    slots: List[AvailabilitySlot]

class AvailabilityTemplateResponse(BaseModel):
    slots: List[AvailabilitySlot]

    class Config:
        from_attributes = True


def _generate_weekly_sessions_for_pattern(
    pattern: SessionRecurrencePattern,
    start_date: date,
    end_date: date,
    start_time: time,
    end_time: time,
    day_code: str
) -> List[AppointmentSession]:
    """Generate weekly slots for a specific day of the week"""
    from datetime import datetime
    
    # Map day code to weekday number
    day_mapping = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
    target_weekday = day_mapping.get(day_code, 0)
    
    slots = []
    current_date = start_date
    
    while current_date <= end_date:
        if current_date.weekday() == target_weekday:
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
                recurrence_group_id=pattern.recurrence_group_id,
                created_at=datetime.utcnow()
            )
            slots.append(slot)
        
        current_date += timedelta(days=1)
    
    return slots

def set_availability_template(
    db: Session,
    template_data: AvailabilityTemplateCreate,
    current_user: User # This is the Doctor
):
    """
    Create weekly recurrence patterns from availability template.
    Each slot creates a recurring pattern for that day of the week.
    """
    doctor_id = current_user.id

    # Start a transaction
    db.begin_nested()
    try:
        # First, delete all existing template entries for this doctor
        db.query(AvailabilityTemplate).filter(AvailabilityTemplate.doctor_user_id == doctor_id).delete()
        
        # Also delete existing recurrence patterns created from templates
        # (Keep manually created patterns)
        db.query(SessionRecurrencePattern).filter(
            SessionRecurrencePattern.doctor_user_id == doctor_id,
            SessionRecurrencePattern.name.like('%Availability%')
        ).delete(synchronize_session='fetch')

        # Map day names to short codes
        day_to_code = {
            "Monday": "Mon",
            "Tuesday": "Tue",
            "Wednesday": "Wed",
            "Thursday": "Thu",
            "Friday": "Fri",
            "Saturday": "Sat",
            "Sunday": "Sun"
        }

        # Create recurrence patterns for each slot
        for slot in template_data.slots:
            if slot.start_time >= slot.end_time:
                raise HTTPException(status_code=400, detail=f"Start time must be before end time for {slot.day_of_week}.")

            # Save template entry (for backward compatibility)
            new_template_entry = AvailabilityTemplate(
                doctor_user_id=doctor_id,
                day_of_week=slot.day_of_week,
                start_time=slot.start_time,
                end_time=slot.end_time,
                slot_duration_minutes=slot.slot_duration_minutes,
                is_telemedicine=slot.is_telemedicine
            )
            db.add(new_template_entry)

            # Create recurrence pattern for this slot
            recurrence_group_id = f"recur_{uuid.uuid4().hex[:12]}"
            day_code = day_to_code.get(slot.day_of_week, "Mon")
            
            # Start from next occurrence of this day
            today = date.today()
            days_ahead = (list(day_to_code.keys()).index(slot.day_of_week) - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 0  # Start today if it's the same day
            start_date = today + timedelta(days=days_ahead)

            # Create weekly recurrence pattern (8 weeks ahead)
            end_date = start_date + timedelta(weeks=8)
            recurrence_config = {
                "duration": "weekly",
                "start_date": start_date.strftime('%Y-%m-%d'),
                "end_date": end_date.strftime('%Y-%m-%d'),
                "repeat_count": None,
                "selected_option": "on_day",
                "selected_days": [day_code],
                "month_days": None,
                "week": None,
                "week_day": None
            }

            pattern = SessionRecurrencePattern(
                doctor_user_id=doctor_id,
                recurrence_group_id=recurrence_group_id,
                name=f"{slot.day_of_week} Availability",
                session_type=SessionType.OFF_SITE if slot.is_telemedicine else SessionType.ON_SITE,
                recurrence_config=recurrence_config,
                start_time_of_day=slot.start_time.strftime('%H:%M'),
                end_time_of_day=slot.end_time.strftime('%H:%M'),
                is_active=True
            )
            db.add(pattern)
            db.flush()  # Get pattern ID
            
            # Generate slots for the next 8 weeks
            slots_to_create = _generate_weekly_sessions_for_pattern(
                pattern, start_date, end_date, slot.start_time, slot.end_time, day_code
            )
            for new_slot in slots_to_create:
                db.add(new_slot)
        
        db.commit()
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An error occurred while setting availability: {str(e)}")

    return get_availability_template(current_user, db)


def get_availability_template(current_user: User, db: Session):
    doctor_id = current_user.id
    
    template_entries = db.query(AvailabilityTemplate).filter(AvailabilityTemplate.doctor_user_id == doctor_id).all()
    
    # Format the response
    response_slots = [
        AvailabilitySlot(
            day_of_week=entry.day_of_week,
            start_time=entry.start_time,
            end_time=entry.end_time,
            slot_duration_minutes=entry.slot_duration_minutes,
            is_telemedicine=entry.is_telemedicine
        ) for entry in template_entries
    ]
    
    return AvailabilityTemplateResponse(slots=response_slots)
