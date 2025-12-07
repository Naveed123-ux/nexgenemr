from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class Vitals(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    blood_pressure = Column(String)
    heart_rate = Column(Integer)
    respiratory_rate = Column(Integer)
    temperature = Column(Float)
    oxygen_saturation = Column(Integer)
    pain_level = Column(String)
    
    appointment_id = Column(Integer, ForeignKey('appointments.id'), unique=True)
    appointment = relationship("Appointment", back_populates="vitals")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if isinstance(value, str):
                setattr(self, key, encrypt_field(value))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        # --- START OF CHANGES ---
        string_fields = ["blood_pressure", "pain_level"]
        # --- END OF CHANGES ---
        if name in string_fields and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value

class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id = Column(Integer, primary_key=True, index=True)
    allergies = Column(JSON)
    current_medications = Column(JSON)
    past_medical_history = Column(JSON)
    
    patient_profile_id = Column(Integer, ForeignKey('patient_profiles.id'), unique=True)
    patient_profile = relationship("PatientProfile", back_populates="medical_history")