from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    specialization = Column(String)
    medical_license_number = Column(String, unique=True)
    qualifications = Column(String)
    years_of_experience = Column(Integer)
    npi_number = Column(String, unique=True)
    dea_number = Column(String, unique=True)
    available_for_telehealth = Column(Boolean, default=False)
    profile_picture_url = Column(String)
    biography = Column(Text)
    languages_spoken = Column(String) # Stored as a comma-separated string

    # Foreign key to the User model
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    user = relationship("User", back_populates="doctor_profile")

    # Foreign key to the Department model
    department_id = Column(Integer, ForeignKey('departments.id'))
    department = relationship("Department")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            # Encrypt all string-based fields for security
            if isinstance(value, str):
                setattr(self, key, encrypt_field(value))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        string_fields = [
            "specialization", "medical_license_number", "qualifications", 
            "npi_number", "dea_number", "profile_picture_url", 
            "biography", "languages_spoken"
        ]
        if name in string_fields and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
