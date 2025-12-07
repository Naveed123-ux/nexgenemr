"""
Pydantic schemas for AppointmentSlot
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, time
from models.appointment_slot_model import SlotType


class SlotCreate(BaseModel):
    """Schema for creating a new slot within a session"""
    start_time: datetime
    end_time: datetime
    duration: int = Field(..., ge=5, description="Duration in minutes, minimum 5")
    title: Optional[str] = None
    label: Optional[str] = None
    slot_color: Optional[str] = None
    modality: Optional[str] = None  # For clinical slots
    is_blocked: bool = False
    slot_type: SlotType = SlotType.CLINICAL
    
    @validator('end_time')
    def end_time_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v
    
    @validator('duration')
    def duration_matches_time_range(cls, v, values):
        if 'start_time' in values and 'end_time' in values:
            calculated_duration = int((values['end_time'] - values['start_time']).total_seconds() / 60)
            if abs(calculated_duration - v) > 1:  # Allow 1 minute tolerance
                raise ValueError(f'Duration {v} does not match time range ({calculated_duration} minutes)')
        return v
    
    @validator('modality')
    def validate_modality(cls, v, values):
        if 'slot_type' in values:
            slot_type = values['slot_type']
            # Clinical slots should have modality, break slots should not
            if slot_type == SlotType.CLINICAL and not v:
                raise ValueError('Clinical slots must have a modality')
            if slot_type == SlotType.BREAK and v:
                raise ValueError('Break slots should not have a modality')
        return v


class SlotUpdate(BaseModel):
    """Schema for updating an existing slot"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = Field(None, ge=5)
    title: Optional[str] = None
    label: Optional[str] = None
    slot_color: Optional[str] = None
    modality: Optional[str] = None
    is_blocked: Optional[bool] = None
    slot_type: Optional[SlotType] = None


class SlotResponse(BaseModel):
    """Schema for slot response"""
    id: int
    session_id: int
    start_time: datetime
    end_time: datetime
    duration: int
    title: Optional[str]
    label: Optional[str]
    slot_color: Optional[str]
    slot_type: str
    modality: Optional[str]
    is_blocked: bool
    is_booked: bool
    created_at: datetime
    updated_at: datetime
    waitlist_match_count: Optional[int] = 0
    has_high_priority_matches: Optional[bool] = False
    
    class Config:
        from_attributes = True


class SlotWithSessionInfo(SlotResponse):
    """Slot response with session information"""
    session_name: str
    session_type: str
    doctor_name: str
    
    class Config:
        from_attributes = True
