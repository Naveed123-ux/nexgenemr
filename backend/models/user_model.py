from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

# Import related models to resolve relationship dependencies
from models.patient_profile_model import PatientProfile 
from models.google_auth_token_model import GoogleAuthToken
from models.staff_profile_model import StaffProfile

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(String)
    updated_at = Column(String)
    
    role_id = Column(Integer, ForeignKey('roles.id'))
    role = relationship("Role")

    # Relationships to other profiles/data
    hospital = relationship("Hospital", back_populates="admin", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    
    patient_profile = relationship(
        "PatientProfile", 
        back_populates="user", 
        uselist=False,
        foreign_keys=[PatientProfile.user_id]
    )
    
    google_auth_token = relationship("GoogleAuthToken", back_populates="doctor", uselist=False)
    staff_profile = relationship("StaffProfile", back_populates="user", uselist=False)
    signature = relationship("UserSignature", back_populates="user", uselist=False)

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["email", "first_name", "last_name", "created_at", "updated_at"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["email", "first_name", "last_name", "created_at", "updated_at"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
