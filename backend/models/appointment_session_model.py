"""
Enhanced Appointment Session Model with Recurrence Support
Supports on-site/off-site sessions with flexible recurrence patterns
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from db.db import Base
import enum


class SessionType(str, enum.Enum):
    """Enum for session location types"""
    ON_SITE = "on_site"
    OFF_SITE = "off_site"


class SessionStatus(str, enum.Enum):
    """Enum for session availability status"""
    AVAILABLE = "Available"
    BOOKED = "Booked"
    CANCELLED = "Cancelled"
    BLOCKED = "Blocked"  # For sessions blocked by doctor


class RecurrenceOption(str, enum.Enum):
    """Enum for recurrence pattern options"""
    ON_DAY = "on_day"  # Specific days of the week
    ON_DATE = "on_date"  # Specific date of the month


class RecurrenceDuration(str, enum.Enum):
    """Enum for recurrence frequency"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class AppointmentSession(Base):
    """
    Enhanced appointment session model with recurrence support.
    Each session represents a single bookable time session.
    """
    __tablename__ = "appointment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic session information
    doctor_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String, nullable=False)  # e.g., "Morning Consultation", "Follow-up"
    session_type = Column(SQLEnum(SessionType), nullable=False, default=SessionType.ON_SITE)
    
    # Time information
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    
    # Status
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.AVAILABLE, nullable=False, index=True)
    
    # Recurrence tracking
    is_recurring = Column(Boolean, default=False)
    recurrence_group_id = Column(String, nullable=True, index=True)  # Groups recurring sessions together
    parent_session_id = Column(Integer, ForeignKey('appointment_sessions.id'), nullable=True)  # Reference to original session
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = relationship("User", foreign_keys=[doctor_user_id])
    parent_session = relationship("AppointmentSession", remote_side=[id], backref="child_sessions")
    appointments = relationship("Appointment", back_populates="session")
    slots = relationship("AppointmentSlot", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AppointmentSession(id={self.id}, name='{self.name}', type={self.session_type}, status={self.status})>"


class SessionRecurrencePattern(Base):
    """
    Stores recurrence pattern configuration for appointment sessions.
    This is the template that defines how sessions should recur.
    """
    __tablename__ = "session_recurrence_patterns"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to doctor
    doctor_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Pattern identification
    recurrence_group_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)  # Pattern name
    session_type = Column(SQLEnum(SessionType), nullable=False)
    
    # Recurrence configuration (stored as JSON for flexibility)
    recurrence_config = Column(JSON, nullable=False)
    """
    Structure of recurrence_config:
    {
        "duration": "daily" | "weekly" | "monthly",
        "start_date": "2025-06-11",
        "end_date": "2026-05-21",  # Optional
        "repeat_count": 1,  # How many times to repeat (optional, alternative to end_date)
        "selected_option": "on_day" | "on_date",
        "selected_days": ["Mon", "Tue", "Wed"],  # For weekly recurrence
        "month_days": [1, 15],  # For monthly recurrence on specific dates
        "week": "first" | "second" | "third" | "fourth" | "last",  # For monthly recurrence
        "week_day": "Mon"  # For monthly recurrence on specific week day
    }
    """
    
    # Time information (for the session template)
    start_time_of_day = Column(String, nullable=False)  # e.g., "09:00"
    end_time_of_day = Column(String, nullable=False)    # e.g., "10:00"
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_generated_date = Column(DateTime, nullable=True)  # Track when sessions were last generated
    
    # Relationships
    doctor = relationship("User")

    def __repr__(self):
        return f"<SessionRecurrencePattern(id={self.id}, name='{self.name}', group_id='{self.recurrence_group_id}')>"