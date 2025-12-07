from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HandoffNoteCreate(BaseModel):
    patient_user_id: int
    shift_from: Optional[str] = None
    shift_to: Optional[str] = None
    additional_notes: Optional[str] = None
    special_instructions: Optional[str] = None

class HandoffNoteUpdate(BaseModel):
    additional_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    shift_from: Optional[str] = None
    shift_to: Optional[str] = None

class HandoffNoteAcknowledge(BaseModel):
    pass  # Just needs the handoff_note_id from URL

class HandoffNoteResponse(BaseModel):
    id: int
    patient_user_id: int
    hospital_id: int
    created_by_staff_id: int
    handoff_date: datetime
    shift_from: Optional[str]
    shift_to: Optional[str]
    ai_generated_summary: Optional[str]
    patient_overview: Optional[str]
    current_condition: Optional[str]
    active_problems: Optional[str]
    recent_changes: Optional[str]
    current_medications: Optional[str]
    pending_tasks: Optional[str]
    important_alerts: Optional[str]
    care_plan: Optional[str]
    family_communication: Optional[str]
    additional_notes: Optional[str]
    special_instructions: Optional[str]
    pdf_file_path: Optional[str]
    is_acknowledged: bool
    acknowledged_by_staff_id: Optional[int]
    acknowledged_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
