# backend/schemas/claim_schema.py
from pydantic import BaseModel
from datetime import date
from typing import Optional

class ClaimBase(BaseModel):
    patient_name: str
    code: str
    doctor_info: str
    due_date: date
    amount: float
    insurance_company: str
    appointment_id: int

class ClaimCreate(ClaimBase):
    pass

class ClaimUpdate(BaseModel):
    status: str
    reason_for_denial: Optional[str] = None

class Claim(ClaimBase):
    id: int
    status: str
    reason_for_denial: Optional[str] = None

    class Config:
        orm_mode = True

class ClaimWithICDDescription(ClaimBase):
    """Enhanced claim response that includes ICD code description"""
    id: int
    status: str
    reason_for_denial: Optional[str] = None
    icd_description: Optional[str] = None

    class Config:
        orm_mode = True


class ClaimDecline(BaseModel):
    reason_for_denial: str