from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String, nullable=False)
    profile_picture_url = Column(String)

    # Foreign key to the User model
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    user = relationship("User", back_populates="staff_profile")

    # Foreign key to the Hospital model
    hospital_id = Column(Integer, ForeignKey('hospitals.id'))
    phone_number = Column(String)
    hospital = relationship("Hospital")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["job_title", "profile_picture_url", "phone_number"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["job_title", "profile_picture_url", "phone_number"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
