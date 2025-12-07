from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientTaskCreate(BaseModel):
    patient_user_id: int

class PatientTaskUpdate(BaseModel):
    is_completed: bool

class PatientTaskResponse(BaseModel):
    id: int
    patient_user_id: int
    task_description: str
    is_completed: bool
    created_by_user_id: int
    task_group_id: str
    task_order: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TaskGroupResponse(BaseModel):
    task_group_id: str
    tasks: list[PatientTaskResponse]
    all_completed: bool
    created_at: datetime
