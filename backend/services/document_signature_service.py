from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user_model import User
from models.signature_model import UserSignature
from models.discharge_summary_model import DischargeSummary
from models.handoff_note_model import HandoffNote
from models.patient_summary_model import PatientSummary
from datetime import datetime


class DocumentSignatureService:
    """
    Service for adding e-signatures to medical documents.
    Handles discharge summaries, handoff notes, and patient summaries.
    """
    
    @staticmethod
    def _verify_user_has_signature(db: Session, user_id: int) -> UserSignature:
        """Verify that user has uploaded a signature"""
        signature = db.query(UserSignature).filter(
            UserSignature.user_id == user_id,
            UserSignature.is_active == True
        ).first()
        
        if not signature:
            raise HTTPException(
                status_code=400,
                detail="You must upload your e-signature before signing documents"
            )
        
        return signature
    
    @staticmethod
    def _determine_signature_field(user_role: str) -> tuple[str, str]:
        """
        Determine which signature field to use based on user role.
        Returns: (signed_by_field, signed_at_field)
        """
        if user_role == "Doctor":
            return ("signed_by_doctor_id", "doctor_signed_at")
        elif user_role in ["Staff", "Receptionist"]:
            return ("signed_by_staff_id", "staff_signed_at")
        elif user_role == "Hospital_Admin":
            return ("signed_by_admin_id", "admin_signed_at")
        else:
            raise HTTPException(
                status_code=403,
                detail="Only doctors, staff, and hospital admins can sign documents"
            )
    
    @staticmethod
    def add_signature_to_discharge_summary(
        db: Session,
        summary_id: int,
        current_user: User
    ) -> DischargeSummary:
        """Add user's signature to a discharge summary"""
        
        # Verify user has uploaded signature
        DocumentSignatureService._verify_user_has_signature(db, current_user.id)
        
        # Get discharge summary
        summary = db.query(DischargeSummary).filter(
            DischargeSummary.id == summary_id
        ).first()
        
        if not summary:
            raise HTTPException(status_code=404, detail="Discharge summary not found")
        
        # Determine which field to update
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Add signature
        setattr(summary, signed_by_field, current_user.id)
        setattr(summary, signed_at_field, datetime.utcnow())
        
        db.commit()
        db.refresh(summary)
        
        return summary
    
    @staticmethod
    def add_signature_to_handoff_note(
        db: Session,
        note_id: int,
        current_user: User
    ) -> HandoffNote:
        """Add user's signature to a handoff note"""
        
        # Verify user has uploaded signature
        DocumentSignatureService._verify_user_has_signature(db, current_user.id)
        
        # Get handoff note
        note = db.query(HandoffNote).filter(
            HandoffNote.id == note_id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Determine which field to update
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Add signature
        setattr(note, signed_by_field, current_user.id)
        setattr(note, signed_at_field, datetime.utcnow())
        
        db.commit()
        db.refresh(note)
        
        return note
    
    @staticmethod
    def add_signature_to_patient_summary(
        db: Session,
        summary_id: int,
        current_user: User
    ) -> PatientSummary:
        """Add user's signature to a patient summary"""
        
        # Verify user has uploaded signature
        DocumentSignatureService._verify_user_has_signature(db, current_user.id)
        
        # Get patient summary
        summary = db.query(PatientSummary).filter(
            PatientSummary.id == summary_id
        ).first()
        
        if not summary:
            raise HTTPException(status_code=404, detail="Patient summary not found")
        
        # Determine which field to update
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Add signature
        setattr(summary, signed_by_field, current_user.id)
        setattr(summary, signed_at_field, datetime.utcnow())
        
        db.commit()
        db.refresh(summary)
        
        return summary
    
    @staticmethod
    def remove_signature_from_discharge_summary(
        db: Session,
        summary_id: int,
        current_user: User
    ) -> DischargeSummary:
        """Remove user's signature from a discharge summary"""
        
        summary = db.query(DischargeSummary).filter(
            DischargeSummary.id == summary_id
        ).first()
        
        if not summary:
            raise HTTPException(status_code=404, detail="Discharge summary not found")
        
        # Determine which field to clear
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Remove signature
        setattr(summary, signed_by_field, None)
        setattr(summary, signed_at_field, None)
        
        db.commit()
        db.refresh(summary)
        
        return summary
    
    @staticmethod
    def remove_signature_from_handoff_note(
        db: Session,
        note_id: int,
        current_user: User
    ) -> HandoffNote:
        """Remove user's signature from a handoff note"""
        
        note = db.query(HandoffNote).filter(
            HandoffNote.id == note_id
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Determine which field to clear
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Remove signature
        setattr(note, signed_by_field, None)
        setattr(note, signed_at_field, None)
        
        db.commit()
        db.refresh(note)
        
        return note
    
    @staticmethod
    def remove_signature_from_patient_summary(
        db: Session,
        summary_id: int,
        current_user: User
    ) -> PatientSummary:
        """Remove user's signature from a patient summary"""
        
        summary = db.query(PatientSummary).filter(
            PatientSummary.id == summary_id
        ).first()
        
        if not summary:
            raise HTTPException(status_code=404, detail="Patient summary not found")
        
        # Determine which field to clear
        signed_by_field, signed_at_field = DocumentSignatureService._determine_signature_field(
            current_user.role.name
        )
        
        # Remove signature
        setattr(summary, signed_by_field, None)
        setattr(summary, signed_at_field, None)
        
        db.commit()
        db.refresh(summary)
        
        return summary
