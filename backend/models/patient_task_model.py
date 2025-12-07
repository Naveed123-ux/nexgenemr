from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime

class PatientTask(Base):
    __tablename__ = "patient_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Patient reference
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient = relationship("User", foreign_keys=[patient_user_id])
    
    # Task details
    task_description = Column(Text, nullable=False)  # One-liner task description
    is_completed = Column(Boolean, default=False)
    
    # Who created the task
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    
    # Task group identifier (to track sets of 4 tasks generated together)
    task_group_id = Column(String, nullable=False)  # UUID to group tasks
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Order within the group (1-4)
    task_order = Column(Integer, nullable=False)
