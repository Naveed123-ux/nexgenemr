from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
from utils.encryption import encrypt_field, decrypt_field
import enum

class LabRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class LabRequestType(str, enum.Enum):
    BRAIN_TUMOR = "BRAIN_TUMOR"
    OTHER = "OTHER"

class LabRequest(Base):
    __tablename__ = "lab_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lab_tech_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Staff user
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    request_type = Column(SQLEnum(LabRequestType), nullable=False)
    status = Column(SQLEnum(LabRequestStatus), default=LabRequestStatus.PENDING, nullable=False)
    
    # Metadata
    priority = Column(String, default="NORMAL") # NORMAL, URGENT
    notes = Column(String, nullable=True) # Doctor's original request notes
    
    # Review fields
    doctor_comment = Column(String, nullable=True)
    doctor_rating = Column(Integer, nullable=True) # 1-5 stars
    price = Column(Float, nullable=True) # Cost of the lab test
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    lab_tech = relationship("User", foreign_keys=[lab_tech_id])
    appointment = relationship("Appointment")
    
    # Results linkage (One-to-One polymorphism or just optional relationships)
    brain_tumor_result = relationship("BrainTumorResult", back_populates="request", uselist=False)

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["notes", "doctor_comment"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["notes", "doctor_comment"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
