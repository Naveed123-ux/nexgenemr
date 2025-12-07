"""
WaitlistBookingToken Model - Manages time-limited booking tokens for waitlist invitations
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
import enum


class TokenStatus(str, enum.Enum):
    """Status of a booking token"""
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class WaitlistBookingToken(Base):
    """
    Represents a unique, time-limited token that authorizes a patient to claim
    a specific appointment slot from the waitlist.
    """
    __tablename__ = "waitlist_booking_tokens"

    id = Column(Integer, primary_key=True, index=True)
    
    # Token identification
    token = Column(String, unique=True, nullable=False, index=True)
    
    # Linked entities
    waitlist_entry_id = Column(Integer, ForeignKey('waitlist_entries.id'), nullable=False, index=True)
    appointment_slot_id = Column(Integer, ForeignKey('appointment_slots.id'), nullable=False, index=True)
    
    # Token lifecycle
    status = Column(SQLEnum(TokenStatus), default=TokenStatus.ACTIVE, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    waitlist_entry = relationship("WaitlistEntry", back_populates="booking_tokens")
    appointment_slot = relationship("AppointmentSlot")

    # Composite index for efficient expiry queries
    __table_args__ = (
        Index('ix_token_expires_status', 'expires_at', 'status'),
    )

    def __repr__(self):
        return f"<WaitlistBookingToken(id={self.id}, token={self.token[:8]}..., status={self.status})>"
