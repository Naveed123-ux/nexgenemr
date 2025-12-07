from sqlalchemy import Column, Integer, String
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class HospitalRequest(Base):
    __tablename__ = "hospital_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone_number = Column(String, nullable=False)
    country = Column(String, nullable=False)
    status = Column(String, default='pending', nullable=False) # pending, accepted, rejected

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
            "name", "code", "email", "phone_number", "country", "status"
        ]
        if name in string_fields and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value