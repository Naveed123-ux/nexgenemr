from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import os
from typing import List

# Import Gemini API
from google import genai

# Import necessary models
from models.user_model import User
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.clinical_data_model import Vitals, MedicalHistory
from models.soap_note_model import SoapNote
from models.appointment_slot_model import AppointmentSlot

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Pydantic model for the response
class SynopsisResponse(BaseModel):
    synopsis_text: str

def _generate_synopsis_from_ai(prompt: str) -> str:
    """
    Calls the Gemini 1.5 Flash model to generate the synopsis.
    """
    # gemini_api_key = os.getenv("GEMINI_API_KEY")
    # if not gemini_api_key:
    #     raise HTTPException(
    #         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         detail="GEMINI_API_KEY is not set in the environment."
    #     )

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",  # or gemini-2.0-flash if available
            contents=[prompt]
        )
        return response.text
    except Exception as e:
        print(f"  ❌ AI Synopsis Generation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating the synopsis with the AI: {e}"
        )

def generate_patient_synopsis(patient_user_id: int, db: Session) -> SynopsisResponse:
    """
    Gathers a complete clinical history for a patient and generates a summary using an AI model.
    """
    # 1. Fetch the patient profile and all related data in an efficient manner
    patient_profile = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.medical_history)
    ).filter(PatientProfile.user_id == patient_user_id).first()

    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {patient_user_id} not found.")

    # 2. Fetch all appointments, along with their SOAP notes and vitals
    appointments = db.query(Appointment).options(
        joinedload(Appointment.slot),
        joinedload(Appointment.vitals),
        joinedload(Appointment.soap_note)
    ).filter(
        Appointment.patient_profile_id == patient_profile.id
    ).join(Appointment.slot).order_by(AppointmentSlot.start_time.asc()).all()

    # 3. Format the collected data into a clear text block for the AI
    patient_data_text = f"PATIENT DEMOGRAPHICS:\n- Name: {patient_profile.user.first_name} {patient_profile.user.last_name}\n\n"

    if patient_profile.medical_history:
        history = patient_profile.medical_history
        patient_data_text += (
            "MEDICAL HISTORY:\n"
            f"- Allergies: {history.allergies}\n"
            f"- Current Medications: {history.current_medications}\n"
            f"- Past Medical History: {history.past_medical_history}\n\n"
        )
    
    patient_data_text += "CLINICAL JOURNEY (Encounters):\n"
    if not appointments:
        patient_data_text += "No appointments found for this patient.\n"
    else:
        for i, appt in enumerate(appointments, 1):
            patient_data_text += f"\n--- Encounter {i}: {appt.slot.start_time.strftime('%Y-%m-%d')} ---\n"
            if appt.vitals:
                vitals = appt.vitals
                patient_data_text += (
                    "Vitals:\n"
                    f"  - BP: {vitals.blood_pressure}, HR: {vitals.heart_rate}, Temp: {vitals.temperature}°F, O2 Sat: {vitals.oxygen_saturation}%\n"
                )
            if appt.soap_note:
                note = appt.soap_note
                patient_data_text += (
                    "SOAP Note:\n"
                    f"  - S: {note.subjective}\n"
                    f"  - O: {note.objective}\n"
                    f"  - A: {note.assessment}\n"
                    f"  - P: {note.plan}\n"
                )

    # 4. Construct the final prompt for the Gemini API
    prompt = f"""
    You are an expert medical scribe AI. Your task is to generate a professional clinical synopsis for a patient based on their EMR data. The output must be valid markdown, suitable for rendering with a library like react-markdown.

    **PATIENT'S COMPLETE RECORD:**
    ---
    {patient_data_text}
    ---

    **YOUR TASK:**
    Review all the provided data and generate a clinical synopsis. The output must follow this exact markdown structure, with each heading on a new line and bolded:

    **Clinical Synopsis: [Patient Name]**

    **Overview**
    A brief, one-sentence opening statement introducing the patient.

    **Overall Assessment**
    Provide a concluding statement on the patient's current overall status based on all available data.

    **RULES:**
    - Each heading must be on its own line and wrapped in double asterisks for bolding (e.g., **Overview**).
    - Use `-` for bullet points.
    - Use `**bold text**` to highlight key terms within paragraphs, such as medication names or diagnoses.
    - Be professional, accurate, and concise.
    """

    # 5. Call the AI to generate the synopsis
    synopsis_text = _generate_synopsis_from_ai(prompt)

    return SynopsisResponse(synopsis_text=synopsis_text)