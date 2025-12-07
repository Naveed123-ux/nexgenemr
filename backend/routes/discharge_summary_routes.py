from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from services.discharge_summary_service import DischargeSummaryService
from services.document_signature_service import DocumentSignatureService
from schemas.discharge_summary_schema import (
    DischargeSummaryCreate,
    DischargeSummaryUpdate,
    DischargeSummaryResponse
)
from typing import List
import os

router = APIRouter()


@router.post("/", response_model=DischargeSummaryResponse, status_code=201)
def create_discharge_summary(
    summary_data: DischargeSummaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new AUTO-GENERATED discharge summary (Doctor or Hospital Admin).
    
    - **patient_user_id**: ONLY required field - just provide the patient's user ID
    - **AUTO-GENERATES** all content from database:
      - Chief complaint from patient profile
      - History from SOAP notes
      - Medical history from patient records
      - Medications from prescriptions
      - Allergies from medical history
      - Physical exam from SOAP notes
      - Vital signs from latest vitals
      - Hospital course from appointments
      - Lab results from lab records
      - Diagnoses from ICD codes
      - Discharge medications from active prescriptions
      - Instructions from SOAP plans
    - Admission date = patient creation date (automatic)
    - Discharge date = current date (automatic)
    - Generates professional PDF and Word documents
    
    **Example Request:**
    ```json
    {
      "patient_user_id": 123
    }
    ```
    """
    return DischargeSummaryService.create_discharge_summary(db, summary_data, current_user)


@router.get("/{summary_id}", response_model=DischargeSummaryResponse)
def get_discharge_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific discharge summary by ID.
    
    - **Doctors**: Can view summaries from their hospital
    - **Patients**: Can only view their own summaries
    - **Hospital Admins**: Can view summaries from their hospital
    """
    return DischargeSummaryService.get_discharge_summary(db, summary_id, current_user)


@router.get("/patient/{patient_user_id}", response_model=List[DischargeSummaryResponse])
def get_patient_discharge_summaries(
    patient_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all discharge summaries for a specific patient.
    
    - **Patients**: Can only view their own summaries
    - **Doctors/Admins**: Can view summaries for patients in their hospital
    """
    return DischargeSummaryService.get_patient_discharge_summaries(db, patient_user_id, current_user)


@router.get("/my-summaries/all", response_model=List[DischargeSummaryResponse])
def get_my_discharge_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all discharge summaries for the current patient user.
    
    - **Patient only**: Returns all discharge summaries for the logged-in patient
    """
    if current_user.role.name != "Patient":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only for patients"
        )
    
    return DischargeSummaryService.get_patient_discharge_summaries(db, current_user.id, current_user)


@router.put("/{summary_id}", response_model=DischargeSummaryResponse)
def update_discharge_summary(
    summary_id: int,
    update_data: DischargeSummaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a discharge summary (only if not finalized).
    
    - **Only the creating doctor** can update
    - Cannot update finalized summaries
    - Regenerates PDF and Word documents
    """
    return DischargeSummaryService.update_discharge_summary(db, summary_id, update_data, current_user)


@router.post("/{summary_id}/finalize", response_model=DischargeSummaryResponse)
def finalize_discharge_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Finalize a discharge summary (makes it read-only).
    
    - **Only the creating doctor** can finalize
    - Once finalized, cannot be edited or deleted
    """
    return DischargeSummaryService.finalize_discharge_summary(db, summary_id, current_user)


@router.delete("/{summary_id}")
def delete_discharge_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a discharge summary (only if not finalized).
    
    - **Only the creating doctor** can delete
    - Cannot delete finalized summaries
    - Deletes associated PDF and Word files
    """
    return DischargeSummaryService.delete_discharge_summary(db, summary_id, current_user)


@router.get("/{summary_id}/download/pdf")
def download_pdf(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the PDF version of a discharge summary.
    
    - Returns the PDF file for download
    - Checks user permissions before allowing download
    """
    summary = DischargeSummaryService.get_discharge_summary(db, summary_id, current_user)
    
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
        filename=f"discharge_summary_{summary.patient_user_id}.pdf"
    )


@router.get("/{summary_id}/download/word")
def download_word(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the Word version of a discharge summary.
    
    - Returns the Word document for download
    - Checks user permissions before allowing download
    """
    summary = DischargeSummaryService.get_discharge_summary(db, summary_id, current_user)
    
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
        filename=f"discharge_summary_{summary.patient_user_id}.docx"
    )


@router.get("/hospital/debug")
def debug_hospital_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Debug endpoint to check hospital relationship and discharge summaries.
    """
    from models.discharge_summary_model import DischargeSummary
    from models.hospital_model import Hospital
    
    debug_info = {
        "user_id": current_user.id,
        "user_role": current_user.role.name,
        "has_hospital_attr": hasattr(current_user, 'hospital'),
        "hospital_from_attr": None,
        "hospital_from_query": None,
        "total_discharge_summaries": db.query(DischargeSummary).count(),
        "discharge_summaries_by_hospital": {}
    }
    
    # Check hospital attribute
    if hasattr(current_user, 'hospital') and current_user.hospital:
        debug_info["hospital_from_attr"] = {
            "id": current_user.hospital.id,
            "name": current_user.hospital.name
        }
    
    # Check hospital by admin_user_id
    hospital = db.query(Hospital).filter(
        Hospital.admin_user_id == current_user.id
    ).first()
    
    if hospital:
        debug_info["hospital_from_query"] = {
            "id": hospital.id,
            "name": hospital.name
        }
        
        # Count summaries for this hospital
        count = db.query(DischargeSummary).filter(
            DischargeSummary.hospital_id == hospital.id
        ).count()
        debug_info["discharge_summaries_by_hospital"][hospital.id] = count
    
    # Get all discharge summaries with their hospital IDs
    all_summaries = db.query(DischargeSummary).all()
    debug_info["all_summaries_hospital_ids"] = [s.hospital_id for s in all_summaries]
    
    return debug_info


@router.get("/hospital/all", response_model=List[DischargeSummaryResponse])
def get_hospital_discharge_summaries(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all discharge summaries for the current user's hospital.
    
    - **Doctor/Staff/Hospital Admin only**
    - Returns summaries for their hospital
    - Supports pagination with limit and offset
    - Ordered by most recent first
    
    **Query Parameters:**
    - `limit`: Number of results (default: 50, max: 100)
    - `offset`: Number of results to skip (default: 0)
    
    **Example:**
    ```
    GET /discharge-summaries/hospital/all?limit=20&offset=0
    ```
    """
    from models.discharge_summary_model import DischargeSummary
    from models.hospital_model import Hospital
    
    # Get hospital ID based on user role
    hospital_id = None
    
    if current_user.role.name == "Doctor":
        if not current_user.doctor_profile:
            raise HTTPException(status_code=400, detail="Doctor profile not found")
        hospital_id = current_user.doctor_profile.department.hospital_id
    elif current_user.role.name == "Staff":
        if not current_user.staff_profile:
            raise HTTPException(status_code=400, detail="Staff profile not found")
        hospital_id = current_user.staff_profile.hospital_id
    elif current_user.role.name in ["Hospital_Admin", "Hospital Admin"]:
        # Hospital admin can view summaries from their hospital
        # Always use explicit query to avoid lazy-loading issues
        hospital = db.query(Hospital).filter(
            Hospital.admin_user_id == current_user.id
        ).first()
        if not hospital:
            raise HTTPException(status_code=400, detail="Hospital not found for this admin")
        hospital_id = hospital.id
    else:
        raise HTTPException(
            status_code=403,
            detail="Only doctors, staff, and hospital admins can view hospital discharge summaries"
        )
    
    # Limit max results
    if limit > 100:
        limit = 100
    
    # Query discharge summaries for this hospital
    summaries = db.query(DischargeSummary).filter(
        DischargeSummary.hospital_id == hospital_id
    ).order_by(
        DischargeSummary.discharge_date.desc()
    ).limit(limit).offset(offset).all()
    
    return summaries


@router.post("/{summary_id}/regenerate-documents", response_model=DischargeSummaryResponse)
def regenerate_documents(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate PDF and Word documents for a discharge summary.
    
    - **Only the creating doctor** can regenerate
    - Useful if template or data was updated
    """
    summary = DischargeSummaryService.get_discharge_summary(db, summary_id, current_user)
    
    if summary.created_by_doctor_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the creating doctor can regenerate documents"
        )
    
    return DischargeSummaryService.generate_documents(db, summary_id)


@router.post("/{summary_id}/sign", response_model=DischargeSummaryResponse)
def sign_discharge_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add your e-signature to a discharge summary.
    
    - **Doctor, Staff, Receptionist, Hospital_Admin** can sign
    - Must have uploaded e-signature first
    - Signature will appear in regenerated PDFs/documents
    - Each role can sign independently (doctor, staff, admin)
    
    **Response:**
    - Returns updated discharge summary with signature info
    - Documents must be regenerated to show signature
    """
    summary = DocumentSignatureService.add_signature_to_discharge_summary(
        db, summary_id, current_user
    )
    
    # Regenerate documents with signature
    DischargeSummaryService.generate_documents(db, summary_id)
    
    return summary


@router.delete("/{summary_id}/sign", response_model=DischargeSummaryResponse)
def remove_signature_from_discharge_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove your e-signature from a discharge summary.
    
    - Removes your signature from the document
    - Documents must be regenerated to reflect removal
    
    **Response:**
    - Returns updated discharge summary without your signature
    """
    summary = DocumentSignatureService.remove_signature_from_discharge_summary(
        db, summary_id, current_user
    )
    
    # Regenerate documents without signature
    DischargeSummaryService.generate_documents(db, summary_id)
    
    return summary
