from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base

class AvailabilityTemplate(Base):
    __tablename__ = "availability_templates"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to the User model (the doctor)
    doctor_user_id = Column(Integer, ForeignKey('users.id'))
    doctor = relationship("User")

    day_of_week = Column(String, nullable=False) # e.g., "Monday", "Tuesday"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration_minutes = Column(Integer, nullable=False, default=20)
    is_telemedicine = Column(Boolean, default=False)
