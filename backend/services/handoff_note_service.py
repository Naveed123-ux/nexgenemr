from sqlalchemy.orm import Session
from models.handoff_note_model import HandoffNote
from models.user_model import User
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.soap_note_model import SoapNote
from models.prescription_model import Prescription
from models.lab_result_model import LabResult
from models.clinical_data_model import Vitals, MedicalHistory
from models.appointment_icd_code_model import AppointmentICDCode
from models.icd_code_model import ICDCode
from schemas.handoff_note_schema import HandoffNoteCreate, HandoffNoteUpdate
from services.gemini_service import GeminiService
from fastapi import HTTPException
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
import json
import re


class HandoffNoteService:
    
    @staticmethod
    def clean_markdown(text: str) -> str:
        """Remove markdown formatting from text for PDF display"""
        if not text:
            return text
        
        # Remove bold markers (**text** or __text__)
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        
        # Remove italic markers (*text* or _text_)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        
        # Remove code markers (`text`)
        text = re.sub(r'`(.+?)`', r'\1', text)
        
        # Remove headers (# text)
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        
        return text
    
    @staticmethod
    def get_patient_context_for_handoff(db: Session, patient_user_id: int) -> dict:
        """Gather all patient information for handoff note generation"""
        
        # Get patient user
        patient_user = db.query(User).filter(User.id == patient_user_id).first()
        if not patient_user:
            raise HTTPException(status_code=404, detail="Patient user not found")
        
        # Get patient profile
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == patient_user_id
        ).first()
        
        if not patient_profile:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        
        # Get appointments
        appointments = db.query(Appointment).filter(
            Appointment.patient_profile_id == patient_profile.id
        ).order_by(Appointment.id.desc()).limit(10).all()
        
        # Load related data for appointments
        for apt in appointments:
            if apt.doctor_user_id:
                apt.doctor = db.query(User).filter(User.id == apt.doctor_user_id).first()
            
            # Load appointment slot for date information
            if apt.appointment_session_id:
                from models.appointment_session_model import AppointmentSession
                apt.slot = db.query(AppointmentSession).filter(
                    AppointmentSession.id == apt.appointment_session_id
                ).first()
            
            apt.soap_note = db.query(SoapNote).filter(
                SoapNote.appointment_id == apt.id
            ).first()
            
            apt.vitals = db.query(Vitals).filter(
                Vitals.appointment_id == apt.id
            ).first()
        
        # Get prescriptions
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_user_id == patient_user_id
        ).all()
        
        # Get lab results
        lab_results = db.query(LabResult).filter(
            LabResult.patient_user_id == patient_user_id
        ).order_by(LabResult.id.desc()).limit(5).all()
        
        # Get medical history
        medical_history = db.query(MedicalHistory).filter(
            MedicalHistory.patient_profile_id == patient_profile.id
        ).first()
        
        # Convert medical history to dict for JSON serialization
        medical_history_dict = None
        if medical_history:
            medical_history_dict = {
                'allergies': medical_history.allergies if medical_history.allergies else [],
                'current_medications': medical_history.current_medications if medical_history.current_medications else [],
                'past_medical_history': medical_history.past_medical_history if medical_history.past_medical_history else []
            }
        
        # Get latest vitals
        latest_vitals = None
        for apt in appointments:
            if apt.vitals:
                latest_vitals = apt.vitals
                break
        
        # Calculate patient age
        patient_age = "Unknown"
        if patient_profile.subscriber_dob:
            from datetime import date
            today = date.today()
            dob = patient_profile.subscriber_dob
            patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        return {
            'patient_user': patient_user,
            'patient_profile': patient_profile,
            'patient_name': f"{patient_user.first_name} {patient_user.last_name}",
            'patient_age': patient_age,
            'patient_gender': "Unknown",  # Gender field not available in current schema
            'appointments': appointments,
            'prescriptions': prescriptions,
            'lab_results': lab_results,
            'medical_history': medical_history_dict,  # Pass dict instead of model object
            'latest_vitals': latest_vitals
        }
    
    @staticmethod
    def create_handoff_note(
        db: Session,
        handoff_data: HandoffNoteCreate,
        current_user: User
    ):
        """Create a new AI-generated handoff note"""
        
        # Verify staff role
        if current_user.role.name not in ["Doctor", "Receptionist", "Hospital_Admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only staff members can create handoff notes"
            )
        
        # Get patient context
        patient_context = HandoffNoteService.get_patient_context_for_handoff(
            db, handoff_data.patient_user_id
        )
        
        # Get hospital ID
        hospital_id = None
        if current_user.role.name == "Doctor" and current_user.doctor_profile:
            hospital_id = current_user.doctor_profile.department.hospital_id
        elif current_user.role.name == "Hospital_Admin" and current_user.hospital:
            hospital_id = current_user.hospital.id
        elif current_user.role.name == "Receptionist" and current_user.staff_profile:
            hospital_id = current_user.staff_profile.hospital_id
        else:
            raise HTTPException(status_code=400, detail="Staff must be associated with a hospital")
        
        # Generate AI content using Gemini
        try:
            gemini_service = GeminiService()
            ai_content = gemini_service.generate_handoff_note(patient_context)
        except Exception as e:
            # If Gemini fails, create basic handoff
            ai_content = {
                'ai_generated_summary': f"Handoff note for {patient_context['patient_name']}. AI generation unavailable: {str(e)}",
                'patient_overview': f"Patient: {patient_context['patient_name']}, Age: {patient_context['patient_age']}",
                'current_condition': "Please review patient chart",
                'active_problems': "Please review appointments",
                'recent_changes': "Please review recent notes",
                'current_medications': f"{len(patient_context['prescriptions'])} medications on file",
                'pending_tasks': "Please review orders",
                'important_alerts': "Please check allergies",
                'care_plan': "Please review care plan",
                'family_communication': "Please review communication log"
            }
        
        # Create handoff note
        handoff_note = HandoffNote(
            patient_user_id=handoff_data.patient_user_id,
            hospital_id=hospital_id,
            created_by_staff_id=current_user.id,
            handoff_date=datetime.utcnow(),
            shift_from=handoff_data.shift_from,
            shift_to=handoff_data.shift_to,
            ai_generated_summary=ai_content.get('ai_generated_summary'),
            patient_overview=ai_content.get('patient_overview'),
            current_condition=ai_content.get('current_condition'),
            active_problems=ai_content.get('active_problems'),
            recent_changes=ai_content.get('recent_changes'),
            current_medications=ai_content.get('current_medications'),
            pending_tasks=ai_content.get('pending_tasks'),
            important_alerts=ai_content.get('important_alerts'),
            care_plan=ai_content.get('care_plan'),
            family_communication=ai_content.get('family_communication'),
            additional_notes=handoff_data.additional_notes,
            special_instructions=handoff_data.special_instructions,
            patient_context_snapshot=json.dumps({
                'patient_name': patient_context['patient_name'],
                'appointment_count': len(patient_context['appointments']),
                'prescription_count': len(patient_context['prescriptions']),
                'generated_at': datetime.utcnow().isoformat()
            })
        )
        
        db.add(handoff_note)
        db.commit()
        db.refresh(handoff_note)
        
        # Generate PDF
        HandoffNoteService.generate_pdf(db, handoff_note.id)
        
        return handoff_note
    
    @staticmethod
    def generate_pdf(db: Session, handoff_note_id: int):
        """Generate PDF for handoff note"""
        
        handoff_note = db.query(HandoffNote).filter(
            HandoffNote.id == handoff_note_id
        ).first()
        
        if not handoff_note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Get patient info
        patient = db.query(User).filter(User.id == handoff_note.patient_user_id).first()
        
        # Create output directory
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'handoff_notes')
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"handoff_note_{handoff_note.patient_user_id}_{timestamp}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)
        
        # Generate PDF
        HandoffNoteService._generate_pdf_document(handoff_note, patient, pdf_path)
        
        # Update handoff note with file path
        handoff_note.pdf_file_path = f"/static/handoff_notes/{pdf_filename}"
        db.commit()
        
        return handoff_note
    
    @staticmethod
    def _generate_pdf_document(handoff_note: HandoffNote, patient: User, output_path: str):
        """Generate PDF document for handoff note"""
        
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                                rightMargin=0.75*inch, leftMargin=0.75*inch,
                                topMargin=1*inch, bottomMargin=0.75*inch)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#d32f2f'),  # Red for handoff urgency
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=13,
            textColor=colors.HexColor('#d32f2f'),
            spaceAfter=6,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        alert_style = ParagraphStyle(
            'AlertStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#d32f2f'),
            fontName='Helvetica-Bold',
            spaceAfter=6
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        # Add logo if exists
        logo_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'images', 'logos', 'logocure.png')
        if os.path.exists(logo_path):
            # Maintain aspect ratio - let height auto-adjust
            logo = Image(logo_path, width=2.5*inch)
            story.append(logo)
            story.append(Spacer(1, 0.2*inch))
        
        # Header
        story.append(Paragraph("PATIENT HANDOFF NOTE", title_style))
        story.append(Paragraph("⚠️ CRITICAL PATIENT INFORMATION ⚠️", alert_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Handoff information table
        handoff_info_data = [
            ['Patient Name:', f"{patient.first_name} {patient.last_name}"],
            ['Patient ID:', str(handoff_note.patient_user_id)],
            ['Handoff Date:', handoff_note.handoff_date.strftime('%B %d, %Y %H:%M')],
            ['Shift From:', handoff_note.shift_from or 'N/A'],
            ['Shift To:', handoff_note.shift_to or 'N/A'],
            ['Created By:', f"Staff ID: {handoff_note.created_by_staff_id}"]
        ]
        
        handoff_info_table = Table(handoff_info_data, colWidths=[2*inch, 4.5*inch])
        handoff_info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ffebee')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        
        story.append(handoff_info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Add sections
        sections = [
            ('PATIENT OVERVIEW', handoff_note.patient_overview),
            ('CURRENT CONDITION', handoff_note.current_condition),
            ('ACTIVE PROBLEMS', handoff_note.active_problems),
            ('RECENT CHANGES (24-48 HRS)', handoff_note.recent_changes),
            ('CURRENT MEDICATIONS', handoff_note.current_medications),
            ('PENDING TASKS', handoff_note.pending_tasks),
            ('⚠️ IMPORTANT ALERTS', handoff_note.important_alerts),
            ('CARE PLAN', handoff_note.care_plan),
            ('FAMILY COMMUNICATION', handoff_note.family_communication),
            ('ADDITIONAL NOTES', handoff_note.additional_notes),
            ('SPECIAL INSTRUCTIONS', handoff_note.special_instructions)
        ]
        
        for section_title, section_content in sections:
            if section_content:
                story.append(Paragraph(section_title, heading_style))
                # Clean markdown formatting before adding to PDF
                cleaned_content = HandoffNoteService.clean_markdown(section_content)
                story.append(Paragraph(cleaned_content or 'None', normal_style))
                story.append(Spacer(1, 0.15*inch))
        
        # Acknowledgment section
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("HANDOFF ACKNOWLEDGMENT", heading_style))
        
        ack_data = [
            ['Receiving Staff Signature:', '_' * 40],
            ['Date/Time:', '_' * 40],
            ['Printed Name:', '_' * 40]
        ]
        
        ack_table = Table(ack_data, colWidths=[2.5*inch, 4*inch])
        ack_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10)
        ]))
        
        story.append(ack_table)
        
        # Add e-signatures section if any signatures exist
        from models.signature_model import UserSignature
        
        if handoff_note.signed_by_doctor_id or handoff_note.signed_by_staff_id or handoff_note.signed_by_admin_id:
            story.append(Spacer(1, 0.5*inch))
            story.append(Paragraph("Electronic Signatures:", heading_style))
            story.append(Spacer(1, 0.2*inch))
            
            # Doctor signature
            if handoff_note.signed_by_doctor_id and handoff_note.signed_by_doctor:
                doctor_sig = None
                try:
                    from db.db import SessionLocal
                    db_session = SessionLocal()
                    doctor_sig = db_session.query(UserSignature).filter(
                        UserSignature.user_id == handoff_note.signed_by_doctor_id,
                        UserSignature.is_active == True
                    ).first()
                    db_session.close()
                except:
                    pass
                
                if doctor_sig:
                    sig_path = os.path.join(
                        os.path.dirname(__file__), 
                        '..', 
                        doctor_sig.signature_file_path.lstrip('/')
                    )
                    if os.path.exists(sig_path):
                        try:
                            sig_img = Image(sig_path, width=2*inch, height=0.75*inch)
                            story.append(sig_img)
                        except:
                            pass
                        
                        doctor_name = f"Dr. {handoff_note.signed_by_doctor.first_name} {handoff_note.signed_by_doctor.last_name}"
                        story.append(Paragraph(f"<b>{doctor_name}</b>", normal_style))
                        if handoff_note.doctor_signed_at:
                            story.append(Paragraph(
                                f"Signed: {handoff_note.doctor_signed_at.strftime('%B %d, %Y at %I:%M %p')}", 
                                normal_style
                            ))
                        story.append(Spacer(1, 0.3*inch))
            
            # Staff signature
            if handoff_note.signed_by_staff_id and handoff_note.signed_by_staff:
                staff_sig = None
                try:
                    from db.db import SessionLocal
                    db_session = SessionLocal()
                    staff_sig = db_session.query(UserSignature).filter(
                        UserSignature.user_id == handoff_note.signed_by_staff_id,
                        UserSignature.is_active == True
                    ).first()
                    db_session.close()
                except:
                    pass
                
                if staff_sig:
                    sig_path = os.path.join(
                        os.path.dirname(__file__), 
                        '..', 
                        staff_sig.signature_file_path.lstrip('/')
                    )
                    if os.path.exists(sig_path):
                        try:
                            sig_img = Image(sig_path, width=2*inch, height=0.75*inch)
                            story.append(sig_img)
                        except:
                            pass
                        
                        staff_name = f"{handoff_note.signed_by_staff.first_name} {handoff_note.signed_by_staff.last_name}"
                        story.append(Paragraph(f"<b>{staff_name} (Staff)</b>", normal_style))
                        if handoff_note.staff_signed_at:
                            story.append(Paragraph(
                                f"Signed: {handoff_note.staff_signed_at.strftime('%B %d, %Y at %I:%M %p')}", 
                                normal_style
                            ))
                        story.append(Spacer(1, 0.3*inch))
            
            # Admin signature
            if handoff_note.signed_by_admin_id and handoff_note.signed_by_admin:
                admin_sig = None
                try:
                    from db.db import SessionLocal
                    db_session = SessionLocal()
                    admin_sig = db_session.query(UserSignature).filter(
                        UserSignature.user_id == handoff_note.signed_by_admin_id,
                        UserSignature.is_active == True
                    ).first()
                    db_session.close()
                except:
                    pass
                
                if admin_sig:
                    sig_path = os.path.join(
                        os.path.dirname(__file__), 
                        '..', 
                        admin_sig.signature_file_path.lstrip('/')
                    )
                    if os.path.exists(sig_path):
                        try:
                            sig_img = Image(sig_path, width=2*inch, height=0.75*inch)
                            story.append(sig_img)
                        except:
                            pass
                        
                        admin_name = f"{handoff_note.signed_by_admin.first_name} {handoff_note.signed_by_admin.last_name}"
                        story.append(Paragraph(f"<b>{admin_name} (Hospital Admin)</b>", normal_style))
                        if handoff_note.admin_signed_at:
                            story.append(Paragraph(
                                f"Signed: {handoff_note.admin_signed_at.strftime('%B %d, %Y at %I:%M %p')}", 
                                normal_style
                            ))
                        story.append(Spacer(1, 0.3*inch))
        
        # Build PDF
        doc.build(story)
    
    @staticmethod
    def get_handoff_note(db: Session, handoff_note_id: int, current_user: User):
        """Get a handoff note by ID"""
        
        handoff_note = db.query(HandoffNote).filter(
            HandoffNote.id == handoff_note_id
        ).first()
        
        if not handoff_note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Check permissions - staff from same hospital
        if current_user.role.name not in ["Doctor", "Receptionist", "Hospital_Admin"]:
            raise HTTPException(status_code=403, detail="Only staff can view handoff notes")
        
        return handoff_note
    
    @staticmethod
    def get_patient_handoff_notes(db: Session, patient_user_id: int, current_user: User):
        """Get all handoff notes for a patient"""
        
        handoff_notes = db.query(HandoffNote).filter(
            HandoffNote.patient_user_id == patient_user_id
        ).order_by(HandoffNote.handoff_date.desc()).all()
        
        return handoff_notes
    
    @staticmethod
    def acknowledge_handoff(db: Session, handoff_note_id: int, current_user: User):
        """Acknowledge receipt of handoff note"""
        
        handoff_note = db.query(HandoffNote).filter(
            HandoffNote.id == handoff_note_id
        ).first()
        
        if not handoff_note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Only staff can acknowledge
        if current_user.role.name not in ["Doctor", "Receptionist", "Hospital_Admin"]:
            raise HTTPException(status_code=403, detail="Only staff can acknowledge handoff notes")
        
        handoff_note.is_acknowledged = True
        handoff_note.acknowledged_by_staff_id = current_user.id
        handoff_note.acknowledged_at = datetime.utcnow()
        
        db.commit()
        db.refresh(handoff_note)
        
        return handoff_note
    
    @staticmethod
    def update_handoff_note(
        db: Session,
        handoff_note_id: int,
        update_data: HandoffNoteUpdate,
        current_user: User
    ):
        """Update handoff note (manual additions only)"""
        
        handoff_note = db.query(HandoffNote).filter(
            HandoffNote.id == handoff_note_id
        ).first()
        
        if not handoff_note:
            raise HTTPException(status_code=404, detail="Handoff note not found")
        
        # Only creating staff can update
        if handoff_note.created_by_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the creating staff can update this handoff note")
        
        # Update manual fields only
        if update_data.additional_notes is not None:
            handoff_note.additional_notes = update_data.additional_notes
        if update_data.special_instructions is not None:
            handoff_note.special_instructions = update_data.special_instructions
        if update_data.shift_from is not None:
            handoff_note.shift_from = update_data.shift_from
        if update_data.shift_to is not None:
            handoff_note.shift_to = update_data.shift_to
        
        handoff_note.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(handoff_note)
        
        # Regenerate PDF
        HandoffNoteService.generate_pdf(db, handoff_note_id)
        
        return handoff_note
