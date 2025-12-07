from fastapi import APIRouter, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Annotated
from typing import List, Optional

from db.db import get_db
from services import soap_notes_service
from utils.dependencies import get_current_user
from models.user_model import User

router = APIRouter(
    prefix="/soap-notes",
    tags=["SOAP Notes Generation"]
)

@router.post("/generate-from-audio", response_model=soap_notes_service.SoapNoteResponse)
async def generate_soap_from_audio(
    appointment_id: Annotated[int, Form()],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), # Ensures user is authenticated
    file: UploadFile = File(...)
):
    """
    Accepts an audio file, transcribes it using Google Speech-to-Text,
    generates a SOAP note using the Gemini API, and saves it to the database.
    Only requires appointment_id since patient info is derived from the appointment.
    """
    return await soap_notes_service.orchestrate_audio_to_soap(
        audio_file=file, 
        appointment_id=appointment_id, 
        db=db
    )

@router.post("/generate-from-text", response_model=soap_notes_service.SoapNoteResponse)
def generate_soap_from_text(
    request: soap_notes_service.SoapNoteFromTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Ensures user is authenticated
):
    """
    Accepts a raw text transcript, generates a SOAP note using the Gemini API,
    and saves it to the database.
    Only requires appointment_id since patient info is derived from the appointment.
    """
    return soap_notes_service.generate_soap_from_text(request, db)

@router.get("/patient/{patient_user_id}", response_model=List[soap_notes_service.SoapNoteResponse])
def get_all_patient_soap_notes(
    patient_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all historical SOAP notes for a specific patient by their user ID.
    """
    return soap_notes_service.get_all_soap_notes_for_patient(patient_user_id, db)


@router.get("/appointment/{appointment_id}", response_model=soap_notes_service.SoapNoteResponse)
def get_soap_note_for_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the SOAP note for a specific appointment ID.
    If no note exists, this will return a structured response with empty/null values.
    """
    note = soap_notes_service.get_soap_note_by_appointment_id(appointment_id, db)
    
    # If no note is found, return a default, empty structure
    if not note:
        return soap_notes_service.SoapNoteResponse(
            transcript="",
            soap_note=soap_notes_service.SoapNote(
                subjective="",
                objective="",
                assessment="",
                plan=""
            ),
            soap_note_id=None
        )
    
    # If a note is found, construct the response from its data
    return soap_notes_service.SoapNoteResponse(
        transcript="", # No transcript is stored for saved notes
        soap_note=soap_notes_service.SoapNote(
            subjective=note.subjective or "",
            objective=note.objective or "",
            assessment=note.assessment or "",
            plan=note.plan or ""
        ),
        soap_note_id=note.id
    )