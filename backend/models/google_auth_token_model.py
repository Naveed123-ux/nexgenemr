from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

class GoogleAuthToken(Base):
    __tablename__ = "google_auth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to the User model (the doctor)
    doctor_user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    doctor = relationship("User", back_populates="google_auth_token")

    # Store the encrypted refresh token
    refresh_token = Column(Text, nullable=False)

    def __init__(self, **kwargs):
        super().__init__()
        # Always encrypt the refresh token
        if 'refresh_token' in kwargs and kwargs['refresh_token'] is not None:
            self.refresh_token = encrypt_field(kwargs.pop('refresh_token'))
        
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name == "refresh_token" and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
