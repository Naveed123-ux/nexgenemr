from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from services.patient_summary_service import PatientSummaryService
from services.document_signature_service import DocumentSignatureService
from schemas.patient_summary_schema import (
    PatientSummaryCreate,
    PatientSummaryUpdate,
    PatientSummaryResponse
)
from typing import List
import os

router = APIRouter()


@router.post("/", response_model=PatientSummaryResponse, status_code=201)
def create_patient_summary(
    summary_data: PatientSummaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new AI-GENERATED patient-friendly summary (Doctor only).
    
    - **patient_user_id**: ID of the patient
    - **title**: Optional - custom title (auto-generated if not provided)
    - **doctor_notes**: Optional - additional notes from doctor
    - **special_instructions**: Optional - special instructions for patient
    
    **AI-Generated Content (in simple, patient-friendly language):**
    - What we found during your visit
    - What it means for your health
    - Your diagnosis (in plain language)
    - Your treatment plan (step-by-step)
    - Your medications (with simple explanations)
    - What to watch for (warning signs)
    - Your next steps
    - Lifestyle tips
    - Common questions answered
    
    **Uses Gemini 2.5 Flash** to analyze medical data and generate easy-to-understand summaries.
    
    **Example Request:**
    ```json
    {
      "patient_user_id": 123,
      "title": "Your Gastritis Visit Summary",
      "doctor_notes": "Patient is responding well to treatment",
      "special_instructions": "Take medication with food"
    }
    ```
    """
    return PatientSummaryService.create_patient_summary(db, summary_data, current_user)


@router.get("/{summary_id}", response_model=PatientSummaryResponse)
def get_patient_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific patient summary by ID.
    
    - **Patients**: Can view their own summaries
    - **Doctors**: Can view summaries for their patients
    - Automatically marks as viewed when patient accesses it
    """
    return PatientSummaryService.get_patient_summary(db, summary_id, current_user)


@router.get("/patient/{patient_user_id}", response_model=List[PatientSummaryResponse])
def get_patient_summaries(
    patient_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all summaries for a specific patient.
    
    - **Patients**: Can view their own summaries
    - **Doctors**: Can view summaries for their patients
    - Returns list ordered by most recent first
    """
    return PatientSummaryService.get_patient_summaries(db, patient_user_id, current_user)


@router.get("/my/summaries", response_model=List[PatientSummaryResponse])
def get_my_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all summaries for the current patient.
    
    - **Patient-only endpoint**
    - Returns all summaries for the logged-in patient
    - Convenient endpoint for patient portal
    """
    if current_user.role.name != "Patient":
        raise HTTPException(status_code=403, detail="This endpoint is for patients only")
    
    return PatientSummaryService.get_patient_summaries(db, current_user.id, current_user)


@router.put("/{summary_id}", response_model=PatientSummaryResponse)
def update_patient_summary(
    summary_id: int,
    update_data: PatientSummaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update patient summary (Doctor only).
    
    - **Only creating doctor** can update
    - Can update: title, doctor_notes, special_instructions
    - **Cannot update AI-generated content**
    - Regenerates PDF and Word documents with updates
    """
    return PatientSummaryService.update_patient_summary(db, summary_id, update_data, current_user)


@router.get("/{summary_id}/download/pdf")
def download_summary_pdf(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the PDF version of a patient summary.
    
    - **Patients**: Can download their own summaries
    - **Doctors**: Can download summaries for their patients
    - Returns PDF file for download
    """
    summary = PatientSummaryService.get_patient_summary(db, summary_id, current_user)
    
    if not summary.pdf_file_path:
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    pdf_full_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        summary.pdf_file_path.lstrip('/')
    )
    
    if not os.path.exists(pdf_full_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
    
    return FileResponse(
        pdf_full_path,
        media_type='application/pdf',
        filename=f"health_summary_{summary.patient_user_id}.pdf"
    )


@router.get("/{summary_id}/download/word")
def download_summary_word(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the Word version of a patient summary.
    
    - **Patients**: Can download their own summaries
    - **Doctors**: Can download summaries for their patients
    - Returns Word document for download
    """
    summary = PatientSummaryService.get_patient_summary(db, summary_id, current_user)
    
    if not summary.word_file_path:
        raise HTTPException(status_code=404, detail="Word file not found")
    
    word_full_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        summary.word_file_path.lstrip('/')
    )
    
    if not os.path.exists(word_full_path):
        raise HTTPException(status_code=404, detail="Word file not found on server")
    
    return FileResponse(
        word_full_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"health_summary_{summary.patient_user_id}.docx"
    )


@router.get("/doctor/recent", response_model=List[PatientSummaryResponse])
def get_doctor_recent_summaries(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent summaries created by the current doctor.
    
    - **Doctor-only endpoint**
    - Returns most recent summaries (default 20)
    - Useful for doctor dashboard
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(status_code=403, detail="This endpoint is for doctors only")
    
    from models.patient_summary_model import PatientSummary
    summaries = db.query(PatientSummary).filter(
        PatientSummary.doctor_user_id == current_user.id
    ).order_by(PatientSummary.summary_date.desc()).limit(limit).all()
    
    return summaries


@router.get("/doctor/unviewed", response_model=List[PatientSummaryResponse])
def get_unviewed_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get summaries that haven't been viewed by patients yet.
    
    - **Doctor-only endpoint**
    - Returns summaries created by this doctor that patients haven't viewed
    - Useful for tracking patient engagement
    """
    if current_user.role.name != "Doctor":
        raise HTTPException(status_code=403, detail="This endpoint is for doctors only")
    
    from models.patient_summary_model import PatientSummary
    summaries = db.query(PatientSummary).filter(
        PatientSummary.doctor_user_id == current_user.id,
        PatientSummary.is_viewed_by_patient == False
    ).order_by(PatientSummary.summary_date.desc()).all()
    
    return summaries


@router.post("/{summary_id}/sign", response_model=PatientSummaryResponse)
def sign_patient_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add your e-signature to a patient summary.
    
    - **Doctor, Staff, Receptionist, Hospital_Admin** can sign
    - Must have uploaded e-signature first
    - Signature will appear in regenerated PDFs/documents
    - Each role can sign independently (doctor, staff, admin)
    
    **Response:**
    - Returns updated patient summary with signature info
    - Documents are automatically regenerated with signature
    """
    summary = DocumentSignatureService.add_signature_to_patient_summary(
        db, summary_id, current_user
    )
    
    # Regenerate documents with signature
    PatientSummaryService.generate_documents(db, summary_id)
    
    return summary


@router.delete("/{summary_id}/sign", response_model=PatientSummaryResponse)
def remove_signature_from_patient_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove your e-signature from a patient summary.
    
    - Removes your signature from the document
    - Documents are automatically regenerated without signature
    
    **Response:**
    - Returns updated patient summary without your signature
    """
    summary = DocumentSignatureService.remove_signature_from_patient_summary(
        db, summary_id, current_user
    )
    
    # Regenerate documents without signature
    PatientSummaryService.generate_documents(db, summary_id)
    
    return summary
