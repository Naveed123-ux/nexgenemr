"""
AppointmentSlot Model - Individual bookable time slots within a session
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Time
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
import enum


class SlotType(str, enum.Enum):
    """Types of slots within a session"""
    CLINICAL = "clinical"
    CLINICAL_ADMIN = "clinicalAdmin"
    BREAK = "break"
    UNALLOCATED = "unallocated"


class ClinicalModality(str, enum.Enum):
    """Modalities for clinical slots"""
    FACE_TO_FACE = "face_to_face"
    HOME_VISIT = "home_visit"
    TELEPHONE = "telephone"


class AppointmentSlot(Base):
    """
    Individual time slots within a session.
    These are the actual bookable units for appointments.
    """
    __tablename__ = "appointment_slots"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to parent session
    session_id = Column(Integer, ForeignKey("appointment_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Time information
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)  # Duration in minutes
    
    # Slot metadata
    title = Column(String, nullable=True)
    label = Column(String, nullable=True)
    slot_color = Column(String, nullable=True)  # Hex color code for UI
    
    # Slot type and modality
    slot_type = Column(SQLEnum(SlotType), nullable=False, default=SlotType.CLINICAL)
    modality = Column(String, nullable=True)  # For clinical slots: face_to_face, home_visit, telephone, etc.
    
    # Status
    is_blocked = Column(Boolean, default=False)
    is_booked = Column(Boolean, default=False)  # True when an appointment is booked in this slot
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("AppointmentSession", back_populates="slots")
    appointment = relationship("Appointment", back_populates="slot", uselist=False)

    def __repr__(self):
        return f"<AppointmentSlot(id={self.id}, session_id={self.session_id}, type={self.slot_type}, {self.start_time} - {self.end_time})>"
