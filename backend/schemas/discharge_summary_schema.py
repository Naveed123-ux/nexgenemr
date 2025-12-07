from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DischargeSummaryCreate(BaseModel):
    patient_user_id: int
    # All other fields will be auto-generated from database

class DischargeSummaryUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    past_medical_history: Optional[str] = None
    medications_on_admission: Optional[str] = None
    allergies: Optional[str] = None
    physical_examination: Optional[str] = None
    vital_signs: Optional[str] = None
    hospital_course: Optional[str] = None
    procedures_performed: Optional[str] = None
    lab_results_summary: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    secondary_diagnosis: Optional[str] = None
    condition_on_discharge: Optional[str] = None
    discharge_medications: Optional[str] = None
    discharge_instructions: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    diet_instructions: Optional[str] = None
    activity_restrictions: Optional[str] = None
    complications: Optional[str] = None
    consultations: Optional[str] = None
    additional_notes: Optional[str] = None

class DischargeSummaryResponse(BaseModel):
    id: int
    patient_user_id: int
    hospital_id: int
    created_by_doctor_id: int
    admission_date: datetime
    discharge_date: datetime
    chief_complaint: Optional[str]
    primary_diagnosis: Optional[str]
    condition_on_discharge: Optional[str]
    pdf_file_path: Optional[str]
    word_file_path: Optional[str]
    is_finalized: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
