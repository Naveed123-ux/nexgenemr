from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import json
import os
from typing import List, Dict, Any

# Import Gemini API
import google.generativeai as genai

# Import necessary models
from models.soap_note_model import SoapNote
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.clinical_data_model import MedicalHistory, Vitals

# Pydantic models to structure the API response
class Highlight(BaseModel):
    text: str
    severity: str # e.g., 'high', 'medium', 'low'
    reason: str

class HighlightResponse(BaseModel):
    highlights: List[Highlight]

def _generate_highlights_from_ai(prompt: str) -> Dict[str, Any]:
    """
    Calls the Gemini 1.5 Flash model and ensures the output is valid JSON.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not set in the environment."
        )

    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # The detailed prompt instructs the AI to return a JSON object.
        raw_response_text = model.generate_content(prompt).text
        
        # Clean the response to ensure it's a valid JSON string
        cleaned_json_string = raw_response_text.strip().replace("```json", "").replace("```", "").strip()
        
        return json.loads(cleaned_json_string)

    except json.JSONDecodeError:
        print(f"  ❌ AI Response (JSON Decode Error): Could not parse the following text into JSON:\n{raw_response_text}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse highlights from AI. The response was not valid JSON."
        )
    except Exception as e:
        print(f"  ❌ AI Generation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating highlights with the AI: {e}"
        )

def generate_contextual_highlights(soap_note_id: int, db: Session) -> HighlightResponse:
    """
    Gathers patient context, analyzes the SOAP note with an AI, and returns highlights.
    """
    # 1. Fetch the SOAP note and all related patient data in one efficient query
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

    if not medical_history:
        raise HTTPException(status_code=400, detail="Patient medical history is required for contextual analysis.")

    # 2. Combine the SOAP note components into a single text block
    full_note_text = (
        f"Subjective: {soap_note.subjective}\n"
        f"Objective: {soap_note.objective}\n"
        f"Assessment: {soap_note.assessment}\n"
        f"Plan: {soap_note.plan}"
    )

    # 3. Construct the detailed prompt for the Gemini API
    prompt = f"""
    You are an expert clinical decision support system. Your task is to analyze a SOAP note in the context of the patient's medical history and current vitals.

    **PATIENT CONTEXT:**
    - Past Medical History: {medical_history.past_medical_history}
    - Current Medications: {medical_history.current_medications}
    - Allergies: {medical_history.allergies}
    
    **CURRENT VITALS:**
    - Blood Pressure: {vitals.blood_pressure if vitals else 'N/A'}
    - Heart Rate: {vitals.heart_rate if vitals else 'N/A'}
    - Temperature: {vitals.temperature if vitals else 'N/A'}

    **SOAP NOTE TO ANALYZE:**
    ---
    {full_note_text}
    ---

    **YOUR TASK:**
    Based on the patient's context, identify exact words or phrases within the SOAP NOTE that are clinically significant. Return a single, valid JSON object with one key: "highlights".
    The "highlights" key should contain an array of objects, where each object has three keys:
    1. "text": An EXACT quote copied directly from the SOAP NOTE TO ANALYZE.
    2. "severity": A rating of 'high', 'medium', or 'low' clinical concern.
    3. "reason": A brief clinical explanation for why this is significant given the patient's context.

    Provide only the raw JSON object in your response. Do not add any extra text or markdown.
    """
    
    # 4. Call the AI and get the structured data
    highlight_data = _generate_highlights_from_ai(prompt)
    
    # 5. Validate the AI's response against our Pydantic models
    try:
        response = HighlightResponse(**highlight_data)
    except Exception as e:
        print(f"  ❌ Failed to parse Pydantic models from AI JSON: {e}")
        raise HTTPException(status_code=500, detail="AI returned valid JSON but with an unexpected structure.")

    return response