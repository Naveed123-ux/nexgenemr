from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientSummaryCreate(BaseModel):
    patient_user_id: int
    title: Optional[str] = None  # Auto-generated if not provided
    doctor_notes: Optional[str] = None
    special_instructions: Optional[str] = None

class PatientSummaryUpdate(BaseModel):
    title: Optional[str] = None
    doctor_notes: Optional[str] = None
    special_instructions: Optional[str] = None

class PatientSummaryResponse(BaseModel):
    id: int
    patient_user_id: int
    doctor_user_id: int
    hospital_id: int
    title: str
    summary_date: datetime
    ai_generated_summary: Optional[str]
    what_we_found: Optional[str]
    what_it_means: Optional[str]
    your_diagnosis: Optional[str]
    your_treatment_plan: Optional[str]
    your_medications: Optional[str]
    what_to_watch_for: Optional[str]
    next_steps: Optional[str]
    lifestyle_tips: Optional[str]
    questions_to_ask: Optional[str]
    doctor_notes: Optional[str]
    special_instructions: Optional[str]
    pdf_file_path: Optional[str]
    word_file_path: Optional[str]
    is_viewed_by_patient: bool
    viewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
