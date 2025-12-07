"""
Pydantic schemas for Waitlist API endpoints
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from models.waitlist_entry_model import WaitlistStatus, WaitlistPriority


class WaitlistEntryCreate(BaseModel):
    """Schema for creating a new waitlist entry"""
    patient_profile_id: int = Field(..., description="ID of the patient profile")
    doctor_user_id: int = Field(..., description="ID of the doctor user")
    priority: WaitlistPriority = Field(default=WaitlistPriority.NORMAL, description="Priority level")
    preferred_days: List[str] = Field(..., description="Preferred days of week or ['Anytime']")
    notes: Optional[str] = Field(None, description="Optional notes about the waitlist entry")
    expiry_date: Optional[date] = Field(None, description="Expiry date (defaults to +30 days if not provided)")
    
    @field_validator('preferred_days')
    @classmethod
    def validate_preferred_days(cls, v):
        """Validate that preferred_days contains valid day names or 'Anytime'"""
        valid_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Anytime"}
        if not v:
            raise ValueError("preferred_days cannot be empty")
        for day in v:
            if day not in valid_days:
                raise ValueError(f"Invalid day: {day}. Must be one of {valid_days}")
        return v
    
    class Config:
        from_attributes = True


class WaitlistEntryUpdate(BaseModel):
    """Schema for updating a waitlist entry"""
    priority: Optional[WaitlistPriority] = Field(None, description="New priority level")
    preferred_days: Optional[List[str]] = Field(None, description="New preferred days")
    notes: Optional[str] = Field(None, description="New notes")
    expiry_date: Optional[date] = Field(None, description="New expiry date")
    
    @field_validator('preferred_days')
    @classmethod
    def validate_preferred_days(cls, v):
        """Validate that preferred_days contains valid day names or 'Anytime'"""
        if v is None:
            return v
        valid_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Anytime"}
        if not v:
            raise ValueError("preferred_days cannot be empty")
        for day in v:
            if day not in valid_days:
                raise ValueError(f"Invalid day: {day}. Must be one of {valid_days}")
        return v
    
    class Config:
        from_attributes = True


class PatientInfo(BaseModel):
    """Nested schema for patient information"""
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    
    class Config:
        from_attributes = True


class DoctorInfo(BaseModel):
    """Nested schema for doctor information"""
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    
    class Config:
        from_attributes = True


class WaitlistEntryResponse(BaseModel):
    """Schema for waitlist entry response"""
    id: int
    patient_profile_id: int
    doctor_user_id: int
    priority: WaitlistPriority
    preferred_days: List[str]
    notes: Optional[str]
    status: WaitlistStatus
    expiry_date: date
    created_at: datetime
    created_by_user_id: int
    updated_at: Optional[datetime]
    updated_by_user_id: Optional[int]
    invited_at: Optional[datetime]
    invitation_expires_at: Optional[datetime]
    
    # Nested objects (optional, populated when relationships are loaded)
    patient: Optional[PatientInfo] = None
    doctor: Optional[DoctorInfo] = None
    
    class Config:
        from_attributes = True


class WaitlistSummaryResponse(BaseModel):
    """
    Schema for waitlist summary (provider dashboard view).
    
    This schema contains ONLY aggregate data and excludes:
    - Patient contact information (email, phone)
    - Personal notes
    - Individual patient details
    
    This ensures providers have read-only access to aggregate demand data
    without access to sensitive patient information.
    """
    doctor_user_id: int
    total_pending: int
    high_priority_count: int
    by_day: dict  # {"Mon": 5, "Tue": 3, ...}
    
    class Config:
        from_attributes = True


class DeleteResponse(BaseModel):
    """Schema for delete operation response"""
    detail: str
    entry_id: int
    
    class Config:
        from_attributes = True


# Triage and Booking Schemas

class TriageMatchResponse(BaseModel):
    """Schema for triage match response"""
    slot_id: int
    slot_start_time: datetime
    slot_end_time: datetime
    doctor_name: str
    doctor_user_id: int
    match_count: int
    matches: List[dict]  # List of enriched match data
    
    class Config:
        from_attributes = True


class InvitationRequest(BaseModel):
    """Schema for sending invitation to waitlist patient"""
    appointment_slot_id: int = Field(..., description="ID of the appointment slot to invite patient for")
    
    class Config:
        from_attributes = True


class InvitationResponse(BaseModel):
    """Schema for invitation response"""
    token: str
    expires_at: datetime
    invitation_sent: bool
    entry_id: int
    slot_id: int
    
    class Config:
        from_attributes = True


class ManualBookingRequest(BaseModel):
    """Schema for manual booking (staff calls patient and books directly)"""
    appointment_slot_id: int = Field(..., description="ID of the appointment slot to book")
    is_telehealth: bool = Field(..., description="Whether the appointment is telehealth")
    reason_for_visit: str = Field(..., description="Reason for the visit")
    
    class Config:
        from_attributes = True


# Patient Booking Schemas

class BookingDetailsResponse(BaseModel):
    """Schema for booking details response (public endpoint)"""
    valid: bool
    slot_available: bool
    error_message: Optional[str] = None
    
    # Only populated if valid
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_time: Optional[datetime] = None
    appointment_end_time: Optional[datetime] = None
    is_telehealth: Optional[bool] = None
    hospital_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ClaimRequest(BaseModel):
    """Schema for claiming appointment with token"""
    reason_for_visit: Optional[str] = Field(None, description="Optional reason for the visit")
    
    class Config:
        from_attributes = True
