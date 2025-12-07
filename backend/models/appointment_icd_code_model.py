from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from db.db import Base

class AppointmentICDCode(Base):
    """
    Junction table for many-to-many relationship between Appointments and ICD Codes.
    Allows multiple ICD codes per appointment with tracking of when each code was added.
    """
    __tablename__ = "appointment_icd_codes"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False)
    icd_code_id = Column(Integer, ForeignKey('icd_codes.id'), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    added_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Track who added the code
    
    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_icd_codes")
    icd_code = relationship("ICDCode")
    added_by = relationship("User")

    def __repr__(self):
        return f"<AppointmentICDCode(appointment_id={self.appointment_id}, icd_code_id={self.icd_code_id})>"
