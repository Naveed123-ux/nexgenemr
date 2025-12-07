import os
import json
from fastapi import UploadFile, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from models.patient_profile_model import PatientProfile # <-- ADD THIS IMPORT
from typing import List, Optional 

# Import Gemini API
import google.generativeai as genai

from db.db import get_db
from models.soap_note_model import SoapNote as SoapNoteModel
from models.appointment_model import Appointment
from models.appointment_session_model import AppointmentSession
# Pydantic models
class SoapNote(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

class SoapNoteResponse(BaseModel):
    transcript: str
    soap_note: SoapNote
    soap_note_id: Optional[int] = None

class SoapNoteFromTextRequest(BaseModel):
    transcript: str
    appointment_id: int

# Audio file validation constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
}


def _validate_audio_file(audio_file: UploadFile, audio_content: bytes) -> None:
    """
    Validates the audio file format and size.
    """
    print(f"   📋 Validating audio file: {audio_file.filename}")
    print(f"   📋 Content Type: {audio_file.content_type}")
    print(f"   📋 File Size: {len(audio_content)} bytes")
    
    # Check file size
    if len(audio_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    if len(audio_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty"
        )
    
    # Validate content type
    content_type = audio_file.content_type
    filename = audio_file.filename.lower()
    
    is_valid = (
        content_type in ALLOWED_AUDIO_TYPES or
        filename.endswith('.mp3') or
        filename.endswith('.wav')
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format. Supported formats: MP3, WAV"
        )
    
    print(f"   ✅ Audio file validated successfully")


def _transcribe_audio_with_gemini(audio_content: bytes, mime_type: str, filename: str) -> str:
    """
    Uses Gemini API to transcribe audio content.
    Gemini 2.5 Flash supports audio input directly.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not set in the environment."
        )

    print("--- 🗣️ Transcribing audio with Gemini API ---")
    
    import tempfile
    temp_file_path = None
    
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Save audio to temporary file
        print("   💾 Saving audio to temporary file...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name
        
        print(f"   📤 Uploading audio file to Gemini... ({temp_file_path})")
        
        # Upload audio file to Gemini
        audio_file = genai.upload_file(
            path=temp_file_path,
            mime_type=mime_type
        )
        print(f"   ✅ Audio file uploaded successfully")
        
        # Create transcription prompt
        prompt = """You are a medical transcription assistant. Listen to this audio recording of a doctor-patient conversation and provide an accurate, detailed transcription.

Instructions:
- Transcribe the entire conversation word-for-word
- Identify speakers as "Doctor:" and "Patient:"
- Include all medical terminology accurately
- Maintain proper punctuation and formatting
- Preserve the natural flow of conversation
- If you cannot understand a word, use [inaudible]

Provide ONLY the transcription, no additional commentary."""

        print("   🎧 Generating transcription...")
        response = model.generate_content([prompt, audio_file])
        transcript = response.text.strip()
        
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to generate transcript from audio"
            )
        
        print(f"   ✅ Transcription completed: {len(transcript)} characters")
        print(f"   📝 Preview: {transcript[:200]}...")
        
        return transcript

    except HTTPException:
        raise
    except Exception as e:
        print(f"   ❌ Gemini Transcription Error: {str(e)}")
        print(f"   ❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe audio with Gemini API: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"   🗑️ Temporary file deleted: {temp_file_path}")
            except Exception as e:
                print(f"   ⚠️ Failed to delete temporary file: {e}")


def _generate_soap_notes_from_text(transcript: str) -> SoapNote:
    """
    Calls the Gemini API to generate structured SOAP notes from a transcript.
    Returns a clean SoapNote object with only the four required fields.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not set in the environment."
        )

    print(f"--- 🧠 Generating SOAP notes with Gemini API ---")
    print(f"   📝 Transcript length: {len(transcript)} characters")
    
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""You are a medical documentation assistant. Extract clinical information from this doctor-patient conversation and format it as SOAP notes.

Return ONLY a valid JSON object with these four fields:
{{
  "subjective": "Patient's complaints, symptoms, and history in their own words",
  "objective": "Measurable clinical findings, vital signs, physical exam results, lab results",
  "assessment": "Diagnosis or clinical impression based on subjective and objective data",
  "plan": "Treatment plan, medications, follow-up instructions, referrals"
}}

Rules:
- Use clear, concise clinical language
- If a section has no information, use "Not documented" 
- Return ONLY the JSON object, no additional text
- Do not include markdown formatting or code blocks
- Extract medical terminology accurately
- Organize information logically within each section

Conversation Transcript:
{transcript}"""

        response = model.generate_content(prompt)
        soap_text = response.text.strip()
        
        print(f"   📄 Raw Gemini response length: {len(soap_text)} characters")
        
        # Remove markdown code blocks if present
        if soap_text.startswith("```json"):
            soap_text = soap_text[7:]
        if soap_text.startswith("```"):
            soap_text = soap_text[3:]
        if soap_text.endswith("```"):
            soap_text = soap_text[:-3]
        soap_text = soap_text.strip()
        
        # Parse JSON response
        try:
            soap_data = json.loads(soap_text)
            soap_note = SoapNote(
                subjective=soap_data.get("subjective", "Not documented"),
                objective=soap_data.get("objective", "Not documented"),
                assessment=soap_data.get("assessment", "Not documented"),
                plan=soap_data.get("plan", "Not documented")
            )
            print(f"   ✅ SOAP notes generated successfully.")
            print(f"   📋 Subjective: {len(soap_note.subjective)} chars")
            print(f"   📋 Objective: {len(soap_note.objective)} chars")
            print(f"   📋 Assessment: {len(soap_note.assessment)} chars")
            print(f"   📋 Plan: {len(soap_note.plan)} chars")
            return soap_note
        except json.JSONDecodeError as je:
            print(f"   ❌ Failed to parse JSON from Gemini response: {je}")
            print(f"   ❌ Raw response: {soap_text[:500]}...")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse SOAP notes from AI response"
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"   ❌ Gemini API Error: {str(e)}")
        print(f"   ❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate SOAP notes with Gemini API: {str(e)}"
        )


async def orchestrate_audio_to_soap(audio_file: UploadFile, appointment_id: int, db: Session) -> SoapNoteResponse:
    """
    Main orchestrator function that handles the end-to-end workflow.
    Processes audio file -> transcript -> SOAP notes -> database
    Uses Gemini API for both transcription and SOAP generation.
    """
    print("\n" + "="*60)
    print("Starting Audio-to-SOAP workflow (Gemini-powered)")
    print("="*60)
    
    # Step 1: Read and validate audio file
    print(f"\n[Step 1] Reading audio file: '{audio_file.filename}'")
    audio_content = await audio_file.read()
    print(f"   ✅ File read complete: {len(audio_content)} bytes")
    
    # Step 2: Validate audio file
    print(f"\n[Step 2] Validating audio file")
    _validate_audio_file(audio_file, audio_content)
    
    # Determine MIME type
    filename = audio_file.filename.lower()
    if filename.endswith('.mp3') or audio_file.content_type in ["audio/mpeg", "audio/mp3"]:
        mime_type = "audio/mp3"
    elif filename.endswith('.wav') or audio_file.content_type in ["audio/wav", "audio/x-wav"]:
        mime_type = "audio/wav"
    else:
        mime_type = "audio/mp3"  # Default fallback
    
    print(f"   ✅ Detected MIME type: {mime_type}")

    # Step 3: Transcribe audio using Gemini
    print(f"\n[Step 3] Transcribing audio with Gemini...")
    transcript = _transcribe_audio_with_gemini(audio_content, mime_type, audio_file.filename)

    if not transcript or transcript.strip() == "":
        print("   ⚠️ Transcription returned empty.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio. Please ensure the audio file contains clear speech."
        )

    print(f"   ✅ Transcription successful: {len(transcript)} characters")

    # Step 4: Generate SOAP notes from transcript
    print(f"\n[Step 4] Generating SOAP notes from transcript...")
    soap_note = _generate_soap_notes_from_text(transcript)

    # Step 5: Save to database
    print(f"\n[Step 5] Saving SOAP note to database...")
    saved_note = save_soap_note(db, appointment_id, soap_note)

    print("\n" + "="*60)
    print("✅ Workflow complete!")
    print(f"   📝 SOAP Note ID: {saved_note.id}")
    print(f"   📋 Appointment ID: {appointment_id}")
    print(f"   🎤 Transcript length: {len(transcript)} chars")
    print("="*60 + "\n")
    
    return SoapNoteResponse(
        transcript=transcript, 
        soap_note=soap_note, 
        soap_note_id=saved_note.id
    )


def generate_soap_from_text(request: SoapNoteFromTextRequest, db: Session) -> SoapNoteResponse:
    """
    Generates SOAP notes directly from a provided text transcript and saves it.
    """
    print("\n" + "="*60)
    print("Starting Text-to-SOAP workflow")
    print("="*60)
    
    if not request.transcript or request.transcript.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Transcript cannot be empty."
        )

    print(f"\n[Step 1] Generating SOAP notes from text...")
    print(f"   📝 Transcript length: {len(request.transcript)} characters")
    soap_note = _generate_soap_notes_from_text(request.transcript)

    print(f"\n[Step 2] Saving SOAP note to database...")
    saved_note = save_soap_note(db, request.appointment_id, soap_note)

    print("\n" + "="*60)
    print("✅ Workflow complete!")
    print(f"   📝 SOAP Note ID: {saved_note.id}")
    print(f"   📋 Appointment ID: {request.appointment_id}")
    print("="*60 + "\n")
    
    return SoapNoteResponse(
        transcript=request.transcript, 
        soap_note=soap_note, 
        soap_note_id=saved_note.id
    )


def save_soap_note(db: Session, appointment_id: int, soap_note_data: SoapNote) -> SoapNoteModel:
    """
    Saves a new SOAP note to the database.
    Patient info is derived from the appointment relationship.
    """
    print(f"   🔍 Verifying appointment ID: {appointment_id}")
    
    # Verify appointment exists
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Appointment with ID {appointment_id} not found."
        )
    
    print(f"   ✅ Appointment found: {appointment.id}")

    # Check if a SOAP note for this appointment already exists
    existing_note = db.query(SoapNoteModel).filter(
        SoapNoteModel.appointment_id == appointment_id
    ).first()
    
    if existing_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"A SOAP note already exists for appointment ID {appointment_id}."
        )

    # Create new SOAP note
    db_soap_note = SoapNoteModel(
        appointment_id=appointment_id,
        subjective=soap_note_data.subjective,
        objective=soap_note_data.objective,
        assessment=soap_note_data.assessment,
        plan=soap_note_data.plan
    )
    
    db.add(db_soap_note)
    db.commit()
    db.refresh(db_soap_note)
    
    print(f"   ✅ SOAP note saved successfully with ID: {db_soap_note.id}")
    return db_soap_note

def get_all_soap_notes_for_patient(patient_user_id: int, db: Session) -> List[SoapNoteResponse]:
    """
    Retrieves all historical SOAP notes for a specific patient using their user_id,
    ordered from newest to oldest.
    """
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {patient_user_id} not found.")

    appointments = db.query(Appointment).filter(Appointment.patient_profile_id == patient_profile.id).all()
    if not appointments:
        return []

    appointment_ids = [appt.id for appt in appointments]

    soap_notes = db.query(SoapNoteModel).join(
        Appointment, SoapNoteModel.appointment_id == Appointment.id
    ).join(
        AppointmentSession, Appointment.appointment_session_id == AppointmentSession.id
    ).filter(
        SoapNoteModel.appointment_id.in_(appointment_ids)
    ).order_by(
        AppointmentSession.start_time.desc()
    ).all()
    # --- END OF CHANGES ---

    return [
        SoapNoteResponse(
            transcript="",  # Historical notes don't have transcripts stored
            soap_note=SoapNote(
                subjective=note.subjective,
                objective=note.objective,
                assessment=note.assessment,
                plan=note.plan
            ),
            soap_note_id=note.id
        )
        for note in soap_notes
    ]


def get_soap_note_by_appointment_id(appointment_id: int, db: Session) -> Optional[SoapNoteModel]:
    """
    Retrieves the SOAP note for a specific appointment ID.
    Returns the note object if found, otherwise returns None.
    """
    soap_note = db.query(SoapNoteModel).filter(SoapNoteModel.appointment_id == appointment_id).first()
    return soap_note