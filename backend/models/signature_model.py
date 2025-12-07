from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime

class UserSignature(Base):
    __tablename__ = "user_signatures"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User reference (Doctor, Staff, Hospital Admin)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    user = relationship("User", back_populates="signature")
    
    # Signature file path
    signature_file_path = Column(String, nullable=False)  # Path to PNG file
    
    # Metadata
    original_filename = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
