from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    patient_profile_id = Column(Integer, ForeignKey('patient_profiles.id'))
    patient = relationship("PatientProfile")

    doctor_user_id = Column(Integer, ForeignKey('users.id'))
    doctor = relationship("User")

    # Link to the specific slot (not session directly)
    appointment_slot_id = Column(Integer, ForeignKey('appointment_slots.id'), unique=True, nullable=False)
    slot = relationship("AppointmentSlot", back_populates="appointment", uselist=False)
    
    # Deprecated: Keep for backward compatibility during migration
    appointment_session_id = Column(Integer, ForeignKey('appointment_sessions.id'), nullable=True)
    session = relationship("AppointmentSession")
    
    is_telehealth = Column(Boolean, default=False)
    google_meet_link = Column(String, nullable=True)
    reason_for_visit = Column(Text, nullable=True)
    results = Column(Text, nullable=True)
    # Status is 'Confirmed' upon booking
    status = Column(String, default='Confirmed')
    icd_code_id = Column(Integer, ForeignKey('icd_codes.id'), nullable=True)
    

    vitals = relationship("Vitals", back_populates="appointment", uselist=False)
    soap_note = relationship("SoapNote", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    icd_code = relationship("ICDCode")  # Keep for backward compatibility
    claims = relationship("Claim", back_populates="appointment")
    
    # New: Many-to-many relationship with ICD codes
    appointment_icd_codes = relationship("AppointmentICDCode", back_populates="appointment", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key == "google_meet_link" and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name == "google_meet_link" and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
