from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
from utils.encryption import encrypt_field, decrypt_field

class BrainTumorResult(Base):
    __tablename__ = "brain_tumor_results"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("lab_requests.id"), unique=True, nullable=False)
    
    # Image path in storage
    image_url = Column(String, nullable=False)
    
    # AI Detection Outputs
    result_class = Column(String, nullable=False) # e.g., "YES", "NO"
    confidence = Column(Float, nullable=False)
    
    # Optional raw AI JSON response for debugging/transparency
    raw_ai_response = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    request = relationship("LabRequest", back_populates="brain_tumor_result")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["raw_ai_response"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["raw_ai_response"] and value is not None:
            try:
                return decrypt_field(value)
            except Exception:
                return value
        return value
