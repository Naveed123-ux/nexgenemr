from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from services.handoff_note_service import HandoffNoteService
from services.document_signature_service import DocumentSignatureService
from schemas.handoff_note_schema import (
    HandoffNoteCreate,
    HandoffNoteUpdate,
    HandoffNoteAcknowledge,
    HandoffNoteResponse
)
from typing import List
import os

router = APIRouter()


@router.post("/", response_model=HandoffNoteResponse, status_code=201)
def create_handoff_note(
    handoff_data: HandoffNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new AI-GENERATED handoff note (Staff only).
    
    - **patient_user_id**: ID of the patient
    - **shift_from**: Optional - shift handing off (e.g., "Day Shift", "Night Shift")
    - **shift_to**: Optional - shift receiving (e.g., "Night Shift", "Day Shift")
    - **additional_notes**: Optional - manual notes to add
    - **special_instructions**: Optional - special instructions
    
    **AI-Generated Content:**
    - Patient overview
    - Current condition
    - Active problems
    - Recent changes (24-48 hours)
    - Current medications
    - Pending tasks
    - Important alerts
    - Care plan
    - Family communication needs
    
    **Uses Gemini AI** to analyze all patient data and generate comprehensive handoff summary.
    
    **Example Request:**
    ```json
    {
      "patient_user_id": 123,
      "shift_from": "Day Shift",
      "shift_to": "Night Shift",
      "additional_notes": "Patient requested pain medication at 2pm",
      "special_instructions": "Monitor vitals every 2 hours"
    }
    ```
    """
    return HandoffNoteService.create_handoff_note(db, handoff_data, current_user)


@router.get("/{handoff_note_id}", response_model=HandoffNoteResponse)
def get_handoff_note(
    handoff_note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific handoff note by ID.
    
    - **Staff only**: Doctors, Receptionists, Hospital Admins
    - Returns complete handoff note with AI-generated content
    """
    return HandoffNoteService.get_handoff_note(db, handoff_note_id, current_user)


@router.get("/patient/{patient_user_id}", response_model=List[HandoffNoteResponse])
def get_patient_handoff_notes(
    patient_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all handoff notes for a specific patient.
    
    - **Staff only**: View handoff history for a patient
    - Returns list ordered by most recent first
    """
    return HandoffNoteService.get_patient_handoff_notes(db, patient_user_id, current_user)


@router.put("/{handoff_note_id}", response_model=HandoffNoteResponse)
def update_handoff_note(
    handoff_note_id: int,
    update_data: HandoffNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update handoff note (manual fields only).
    
    - **Only creating staff** can update
    - Can update: additional_notes, special_instructions, shift_from, shift_to
    - **Cannot update AI-generated content**
    - Regenerates PDF with updates
    """
    return HandoffNoteService.update_handoff_note(db, handoff_note_id, update_data, current_user)


@router.post("/{handoff_note_id}/acknowledge", response_model=HandoffNoteResponse)
def acknowledge_handoff(
    handoff_note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Acknowledge receipt of handoff note.
    
    - **Staff only**: Receiving staff acknowledges handoff
    - Records who acknowledged and when
    - Important for handoff accountability
    """
    return HandoffNoteService.acknowledge_handoff(db, handoff_note_id, current_user)


@router.get("/{handoff_note_id}/download/pdf")
def download_handoff_pdf(
    handoff_note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the PDF version of a handoff note.
    
    - Returns PDF file for download
    - **Staff only**
    - Includes all AI-generated and manual content
    """
    handoff_note = HandoffNoteService.get_handoff_note(db, handoff_note_id, current_user)
    
    if not handoff_note.pdf_file_path:
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    pdf_full_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        handoff_note.pdf_file_path.lstrip('/')
    )
    
    if not os.path.exists(pdf_full_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
    
    return FileResponse(
        pdf_full_path,
        media_type='application/pdf',
        filename=f"handoff_note_{handoff_note.patient_user_id}.pdf"
    )


@router.get("/hospital/recent", response_model=List[HandoffNoteResponse])
def get_recent_hospital_handoffs(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent handoff notes for the current hospital.
    
    - **Staff only**: View recent handoffs in your hospital
    - Returns most recent handoffs (default 20)
    - Useful for shift change overview
    """
    # Get hospital ID
    hospital_id = None
    if current_user.role.name == "Doctor" and current_user.doctor_profile:
        hospital_id = current_user.doctor_profile.department.hospital_id
    elif current_user.role.name == "Hospital_Admin" and current_user.hospital:
        hospital_id = current_user.hospital.id
    elif current_user.role.name == "Receptionist" and current_user.staff_profile:
        hospital_id = current_user.staff_profile.hospital_id
    else:
        raise HTTPException(status_code=403, detail="Staff must be associated with a hospital")
    
    from models.handoff_note_model import HandoffNote
    handoff_notes = db.query(HandoffNote).filter(
        HandoffNote.hospital_id == hospital_id
    ).order_by(HandoffNote.handoff_date.desc()).limit(limit).all()
    
    return handoff_notes


@router.get("/hospital/unacknowledged", response_model=List[HandoffNoteResponse])
def get_unacknowledged_handoffs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get unacknowledged handoff notes for the current hospital.
    
    - **Staff only**: View handoffs that haven't been acknowledged
    - Critical for ensuring handoff completion
    - Returns all unacknowledged handoffs
    """
    # Get hospital ID
    hospital_id = None
    if current_user.role.name == "Doctor" and current_user.doctor_profile:
        hospital_id = current_user.doctor_profile.department.hospital_id
    elif current_user.role.name == "Hospital_Admin" and current_user.hospital:
        hospital_id = current_user.hospital.id
    elif current_user.role.name == "Receptionist" and current_user.staff_profile:
        hospital_id = current_user.staff_profile.hospital_id
    else:
        raise HTTPException(status_code=403, detail="Staff must be associated with a hospital")
    
    from models.handoff_note_model import HandoffNote
    handoff_notes = db.query(HandoffNote).filter(
        HandoffNote.hospital_id == hospital_id,
        HandoffNote.is_acknowledged == False
    ).order_by(HandoffNote.handoff_date.desc()).all()
    
    return handoff_notes


@router.post("/{note_id}/sign", response_model=HandoffNoteResponse)
def sign_handoff_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add your e-signature to a handoff note.
    
    - **Doctor, Staff, Receptionist, Hospital_Admin** can sign
    - Must have uploaded e-signature first
    - Signature will appear in regenerated PDFs
    - Each role can sign independently (doctor, staff, admin)
    
    **Response:**
    - Returns updated handoff note with signature info
    - PDF is automatically regenerated with signature
    """
    note = DocumentSignatureService.add_signature_to_handoff_note(
        db, note_id, current_user
    )
    
    # Regenerate PDF with signature
    HandoffNoteService.generate_pdf(db, note_id)
    
    return note


@router.delete("/{note_id}/sign", response_model=HandoffNoteResponse)
def remove_signature_from_handoff_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove your e-signature from a handoff note.
    
    - Removes your signature from the document
    - PDF is automatically regenerated without signature
    
    **Response:**
    - Returns updated handoff note without your signature
    """
    note = DocumentSignatureService.remove_signature_from_handoff_note(
        db, note_id, current_user
    )
    
    # Regenerate PDF without signature
    HandoffNoteService.generate_pdf(db, note_id)
    
    return note
