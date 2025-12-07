from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from db.db import Base
import enum

# Define an Enum for the prescription status
class PrescriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    medication = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True) # End date can be optional
    notes = Column(Text, nullable=True)
    status = Column(String, default=PrescriptionStatus.ACTIVE, nullable=False)

    # Relationships to link back to patient and appointment
    patient = relationship("User")
    appointment = relationship("Appointment")