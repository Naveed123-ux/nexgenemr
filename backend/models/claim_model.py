# backend/models/claim_model.py
from sqlalchemy import Column, Integer, String, Float, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from db.db import Base
import enum

class ClaimStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    declined = "declined"

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, index=True)
    code = Column(String, index=True)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.pending)
    doctor_info = Column(String)
    due_date = Column(Date)
    amount = Column(Float)
    insurance_company = Column(String)
    reason_for_denial = Column(String, nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))

    appointment = relationship("Appointment", back_populates="claims")