from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import date

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    result_date = Column(Date, default=date.today, nullable=False)

    hemoglobin = Column(Float, nullable=True)
    wbc = Column(Float, nullable=True)
    glucose = Column(Float, nullable=True)
    creatinine = Column(Float, nullable=True)
    alt = Column(Float, nullable=True)
    total_cholesterol = Column(Float, nullable=True)

    # Relationship to the User model
    patient = relationship("User")