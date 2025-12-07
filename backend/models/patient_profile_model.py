from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core Demographics
    client_type = Column(String)
    billing_type = Column(String)
    status = Column(Boolean, default=False)

    # --- START OF CHANGES ---
    # New intake fields
    chief_complaint = Column(String, nullable=True)
    bay_or_room = Column(String, nullable=True)
    triage_level = Column(String, nullable=True)
    lab_status = Column(String, nullable=True)
    # --- END OF CHANGES ---

    # Insurance Details (nullable)
    insurer_name = Column(String, nullable=True)
    member_id = Column(String, nullable=True)
    group_id = Column(String, nullable=True)
    subscriber_first_name = Column(String, nullable=True)
    subscriber_last_name = Column(String, nullable=True)
    subscriber_dob = Column(Date, nullable=True)
    subscriber_relationship_to_patient = Column(String, nullable=True)

    # Foreign key to the User model (for portal login)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    user = relationship("User", back_populates="patient_profile", foreign_keys=[user_id])
    
    # Foreign key to the Hospital model
    hospital_id = Column(Integer, ForeignKey('hospitals.id'))
    hospital = relationship("Hospital")

    # Field to assign a doctor
    assigned_doctor_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id])


    medical_history = relationship("MedicalHistory", back_populates="patient_profile", uselist=False)


    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if isinstance(value, str):
                setattr(self, key, encrypt_field(value))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        string_fields = [
            "client_type", "billing_type", "insurer_name", "member_id", "group_id",
            "subscriber_first_name", "subscriber_last_name", 
            "subscriber_relationship_to_patient",
            # --- START OF CHANGES ---
            "chief_complaint", "bay_or_room", "triage_level", "lab_status"
            # --- END OF CHANGES ---
        ]
        if name in string_fields and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value