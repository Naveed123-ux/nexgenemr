from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ICDCodeBase(BaseModel):
    """Base ICD Code schema"""
    code: str
    description: str
    
    class Config:
        from_attributes = True

class ICDCodeResponse(ICDCodeBase):
    """ICD Code response with ID"""
    id: int

class AddICDCodeRequest(BaseModel):
    """Request to add ICD code(s) to an appointment"""
    icd_code_ids: List[int]

class RemoveICDCodeRequest(BaseModel):
    """Request to remove an ICD code from an appointment"""
    icd_code_id: int

class AppointmentICDCodeResponse(BaseModel):
    """Response for appointment ICD code association"""
    id: int
    appointment_id: int
    icd_code_id: int
    icd_code: ICDCodeResponse
    added_at: datetime
    added_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class UpdateAppointmentICDCodesRequest(BaseModel):
    """Request to update all ICD codes for an appointment"""
    icd_code_ids: List[int]
