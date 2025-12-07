from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class SoapNote(Base):
    __tablename__ = "soap_notes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Removed patient_id - it's redundant since we can access patient via appointment
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False, unique=True)

    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)

    # Removed direct patient relationship - access via appointment.patient instead
    appointment = relationship("Appointment", back_populates="soap_note")
    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["subjective", "objective", "assessment", "plan"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["subjective", "objective", "assessment", "plan"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value