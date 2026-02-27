from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone_number = Column(String)
    country = Column(String)
    address = Column(Text)
    time_zone = Column(String)
    primary_language = Column(String)
    
    header_text = Column(String)
    tagline = Column(String)
    description = Column(Text)
    logo_url = Column(String)
    favicon_url = Column(String)
    sidebar_color = Column(String)
    header_color = Column(String)
    
    admin_user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    admin = relationship("User", back_populates="hospital")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(String)


    # --- FIX: Add the missing relationship to departments ---
    departments = relationship("Department", back_populates="hospital")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __setattr__(self, name, value):
        string_fields = [
            "name", "code", "email", "phone_number", "country", "address", 
            "time_zone", "primary_language", "header_text", "tagline", 
            "description", "logo_url", "favicon_url", "sidebar_color", "header_color"
        ]
        if name in string_fields and isinstance(value, str):
            # Check if it's already encrypted (starts with a known prefix or base64 structure)
            # For simplicity, we assume if we are setting a str, we want it encrypted.
            # But we must be careful not to double encrypt.
            # However, decrypt_field handles original values on failure.
            try:
                # If we can decrypt it, it's already encrypted.
                decrypt_field(value)
                super().__setattr__(name, value)
            except Exception:
                # Not encrypted, so encrypt it.
                super().__setattr__(name, encrypt_field(value))
        else:
            super().__setattr__(name, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        string_fields = [
            "name", "code", "email", "phone_number", "country", "address", 
            "time_zone", "primary_language", "header_text", "tagline", 
            "description", "logo_url", "favicon_url", "sidebar_color", "header_color"
        ]
        if name in string_fields and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
