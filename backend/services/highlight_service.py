import os
import json
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Dict, Any
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception

# Import Gemini API
from google import genai
from google.genai.errors import ClientError

# Import necessary models
from models.soap_note_model import SoapNote
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.clinical_data_model import MedicalHistory, Vitals

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

def is_rate_limit_error(exception):
    """Check if the exception is a 429 rate limit error."""
    if isinstance(exception, ClientError):
        return exception.code == 429
    if isinstance(exception, HTTPException):
        return exception.status_code == 429
    return False

# Pydantic models to structure the API response
class Highlight(BaseModel):
    text: str
    severity: str # e.g., 'high', 'medium', 'low'
    reason: str

class HighlightResponse(BaseModel):
    highlights: List[Highlight]

@retry(
    retry=retry_if_exception(is_rate_limit_error),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    reraise=True
)
def _generate_highlights_from_ai(prompt: str) -> Dict[str, Any]:
    """
    Calls the Gemini Flash model and ensures the output is valid JSON.
    Includes retry logic for rate limits.
    """
    try:
        response = gemini_client.models.generate_content(
            model='gemini-flash-latest',
            contents=[prompt]
        )

        raw_text = response.text.strip()
        # Remove accidental markdown/code fences
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        return json.loads(raw_text)

    except json.JSONDecodeError:
        print(f"AI Response JSON Decode Error:\n{raw_text}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse highlights from AI. The response was not valid JSON."
        )
    except ClientError as e:
        if e.code == 429:
            print(f"Gemini API Rate Limit hit in highlights (429): {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI service quota exhausted. Please try again in a few minutes."
            )
        raise e
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error while generating highlights with AI: {e}"
        )

def generate_contextual_highlights(soap_note_id: int, db: Session) -> HighlightResponse:
    """
    Gathers patient context, analyzes the SOAP note with an AI, and returns highlights.
    """
    # 1. Fetch the SOAP note and all related patient data
    soap_note = db.query(SoapNote).options(
        joinedload(SoapNote.appointment).joinedload(Appointment.vitals),
        joinedload(SoapNote.appointment).joinedload(Appointment.patient).joinedload(PatientProfile.medical_history)
    ).filter(SoapNote.id == soap_note_id).first()

    if not soap_note:
        raise HTTPException(status_code=404, detail="SOAP note not found.")
    
    appointment = soap_note.appointment
    patient_profile = appointment.patient
    medical_history = patient_profile.medical_history
    vitals = appointment.vitals

    # 2. Extract context with fallbacks
    history_text = "Not provided"
    medications_text = "Not provided"
    allergies_text = "Not provided"

    if medical_history:
        # Convert JSON/List if they are stored as such
        pmh = medical_history.past_medical_history
        if isinstance(pmh, list):
            history_text = ", ".join(pmh) if pmh else "None noted"
        elif pmh:
            history_text = pmh

        meds = medical_history.current_medications
        if isinstance(meds, list):
            medications_text = ", ".join(meds) if meds else "None noted"
        elif meds:
            medications_text = meds

        alg = medical_history.allergies
        if isinstance(alg, list):
            allergies_text = ", ".join(alg) if alg else "No known allergies"
        elif alg:
            allergies_text = alg

    # 3. Combine the SOAP note components
    full_note_text = (
        f"Subjective: {soap_note.subjective}\n"
        f"Objective: {soap_note.objective}\n"
        f"Assessment: {soap_note.assessment}\n"
        f"Plan: {soap_note.plan}"
    )

    # 4. Construct the detailed prompt
    prompt = f"""
    You are an expert clinical decision support system. Your task is to analyze a SOAP note in the context of the patient's medical history and current vitals.

    **PATIENT CONTEXT:**
    - Past Medical History: {history_text}
    - Current Medications: {medications_text}
    - Allergies: {allergies_text}
    
    **CURRENT VITALS:**
    - Blood Pressure: {vitals.blood_pressure if vitals else 'Not recorded'}
    - Heart Rate: {vitals.heart_rate if vitals else 'Not recorded'}
    - Temperature: {vitals.temperature if vitals else 'Not recorded'}

    **SOAP NOTE TO ANALYZE:**
    ---
    {full_note_text}
    ---

    **YOUR TASK:**
    Based on the patient's context (even if some data is not provided), identify exact words or phrases within the SOAP NOTE that are clinically significant. Return a single, valid JSON object with one key: "highlights".
    The "highlights" key should contain an array of objects, where each object has three keys:
    1. "text": An EXACT quote copied directly from the SOAP NOTE TO ANALYZE.
    2. "severity": A rating of 'high', 'medium', or 'low' clinical concern.
    3. "reason": A brief clinical explanation for why this is significant given the patient's context.

    Provide only the raw JSON object in your response. Do not add any extra text or markdown.
    """
    
    # 5. Call the AI and get the structured data
    highlight_data = _generate_highlights_from_ai(prompt)
    
    # 6. Validate the AI's response
    try:
        response = HighlightResponse(**highlight_data)
    except Exception as e:
        print(f"Failed to parse Pydantic models from AI JSON: {e}")
        raise HTTPException(status_code=500, detail="AI returned valid JSON but with an unexpected structure.")

    return response