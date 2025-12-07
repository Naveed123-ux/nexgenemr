"""
WaitlistEntry Model - Manages patient waitlist for fully-booked providers
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
import enum


class WaitlistStatus(str, enum.Enum):
    """Status of a waitlist entry"""
    PENDING = "pending"
    INVITED = "invited"
    BOOKED = "booked"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class WaitlistPriority(str, enum.Enum):
    """Priority level for waitlist entries"""
    NORMAL = "normal"
    HIGH = "high"


class WaitlistEntry(Base):
    """
    Represents a patient's request for an earlier appointment with a specific provider.
    Used to manage patient demand when providers are fully booked.
    """
    __tablename__ = "waitlist_entries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Patient and Provider
    patient_profile_id = Column(Integer, ForeignKey('patient_profiles.id'), nullable=False, index=True)
    doctor_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Priority and Preferences
    priority = Column(SQLEnum(WaitlistPriority), default=WaitlistPriority.NORMAL, nullable=False)
    preferred_days = Column(JSON, nullable=False)  # ["Mon", "Tue", "Wed", "Thu", "Fri"] or ["Anytime"]
    notes = Column(Text, nullable=True)
    
    # Status and Lifecycle
    status = Column(SQLEnum(WaitlistStatus), default=WaitlistStatus.PENDING, nullable=False, index=True)
    expiry_date = Column(Date, nullable=False, index=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Invitation tracking
    invited_at = Column(DateTime, nullable=True)
    invitation_expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    patient = relationship("PatientProfile", foreign_keys=[patient_profile_id])
    doctor = relationship("User", foreign_keys=[doctor_user_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    updated_by = relationship("User", foreign_keys=[updated_by_user_id])
    booking_tokens = relationship("WaitlistBookingToken", back_populates="waitlist_entry", cascade="all, delete-orphan")

    # Composite index for efficient matching queries
    __table_args__ = (
        Index('ix_waitlist_doctor_status_expiry', 'doctor_user_id', 'status', 'expiry_date'),
    )

    def __repr__(self):
        return f"<WaitlistEntry(id={self.id}, patient_id={self.patient_profile_id}, doctor_id={self.doctor_user_id}, status={self.status}, priority={self.priority})>"
