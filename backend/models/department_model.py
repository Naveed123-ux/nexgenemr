from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    logo_url = Column(String)
    no_of_members = Column(Integer, default=0)
    
    hospital_id = Column(Integer, ForeignKey('hospitals.id'))
    hospital = relationship("Hospital", back_populates="departments")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["name", "logo_url"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["name", "logo_url"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
