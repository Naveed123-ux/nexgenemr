from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.patient_task_model import PatientTask
from models.user_model import User
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.soap_note_model import SoapNote
from models.prescription_model import Prescription
from models.clinical_data_model import Vitals, MedicalHistory
from schemas.patient_task_schema import PatientTaskResponse, TaskGroupResponse
from services.gemini_service import GeminiService
from datetime import datetime
import uuid
import json


class PatientTaskService:
    
    @staticmethod
    def can_generate_new_tasks(db: Session, patient_user_id: int) -> bool:
        """
        Check if new tasks can be generated for a patient.
        Returns True only if all current tasks are completed or no tasks exist.
        """
        # Get the most recent task group for this patient
        latest_task = db.query(PatientTask).filter(
            PatientTask.patient_user_id == patient_user_id
        ).order_by(PatientTask.created_at.desc()).first()
        
        if not latest_task:
            return True  # No tasks exist, can generate
        
        # Check if all tasks in the latest group are completed
        tasks_in_group = db.query(PatientTask).filter(
            PatientTask.task_group_id == latest_task.task_group_id
        ).all()
        
        all_completed = all(task.is_completed for task in tasks_in_group)
        return all_completed
    
    @staticmethod
    def get_patient_context(db: Session, patient_user_id: int) -> dict:
        """Gather patient information for AI task generation"""
        
        # Get patient user and profile
        patient_user = db.query(User).filter(User.id == patient_user_id).first()
        if not patient_user:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == patient_user_id
        ).first()
        
        if not patient_profile:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        
        # Get appointments with SOAP notes
        appointments = db.query(Appointment).filter(
            Appointment.patient_profile_id == patient_profile.id
        ).order_by(Appointment.id.desc()).limit(5).all()
        
        # Load SOAP notes for appointments
        for apt in appointments:
            apt.soap_note = db.query(SoapNote).filter(
                SoapNote.appointment_id == apt.id
            ).first()
        
        # Get prescriptions
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_user_id == patient_user_id,
            Prescription.status == "active"
        ).all()
        
        # Get latest vitals
        latest_vitals = None
        for apt in appointments:
            vitals = db.query(Vitals).filter(
                Vitals.appointment_id == apt.id
            ).first()
            if vitals:
                latest_vitals = vitals
                break
        
        # Get medical history
        medical_history = db.query(MedicalHistory).filter(
            MedicalHistory.patient_profile_id == patient_profile.id
        ).first()
        
        return {
            "patient_user": patient_user,
            "patient_profile": patient_profile,
            "patient_name": f"{patient_user.first_name} {patient_user.last_name}",
            "appointments": appointments,
            "prescriptions": prescriptions,
            "latest_vitals": latest_vitals,
            "medical_history": medical_history
        }
    
    @staticmethod
    def generate_tasks_with_ai(patient_context: dict) -> list[str]:
        """
        Use Gemini AI to generate 4 next-step tasks for the patient.
        Returns a list of 4 one-liner task descriptions.
        """
        
        gemini_service = GeminiService()
        
        # Create prompt for task generation
        patient_name = patient_context.get('patient_name', 'Unknown')
        appointments = patient_context.get('appointments', [])
        prescriptions = patient_context.get('prescriptions', [])
        vitals = patient_context.get('latest_vitals')
        medical_history = patient_context.get('medical_history')
        
        # Format appointment info
        appointment_info = []
        for apt in appointments[:3]:
            if hasattr(apt, 'soap_note') and apt.soap_note:
                soap = apt.soap_note
                info = f"Visit: {apt.reason_for_visit or 'N/A'}"
                if soap.assessment:
                    info += f" | Assessment: {soap.assessment[:100]}"
                if soap.plan:
                    info += f" | Plan: {soap.plan[:100]}"
                appointment_info.append(info)
        
        # Format prescription info
        med_info = [f"{rx.medication} {rx.dosage}" for rx in prescriptions[:5]]
        
        # Format vitals
        vitals_info = "No recent vitals"
        if vitals:
            vitals_parts = []
            if hasattr(vitals, 'blood_pressure') and vitals.blood_pressure:
                vitals_parts.append(f"BP: {vitals.blood_pressure}")
            if hasattr(vitals, 'heart_rate') and vitals.heart_rate:
                vitals_parts.append(f"HR: {vitals.heart_rate}")
            vitals_info = ", ".join(vitals_parts) if vitals_parts else "No vitals"
        
        prompt = f"""
You are a medical care coordinator creating a to-do list of next steps for patient care.

PATIENT: {patient_name}

RECENT VISITS:
{chr(10).join(appointment_info) if appointment_info else "No recent visits"}

CURRENT MEDICATIONS:
{chr(10).join(med_info) if med_info else "No active medications"}

LATEST VITALS:
{vitals_info}

MEDICAL HISTORY:
{json.dumps(medical_history.__dict__ if medical_history else {}, default=str)[:200]}

Generate EXACTLY 4 actionable next-step tasks for this patient's care. Each task should be:
- A single, clear action item (one-liner)
- Specific and actionable
- Clinically relevant based on the patient's information
- Written in professional medical language
- Between 10-20 words

Format your response as a simple numbered list:
1. [First task]
2. [Second task]
3. [Third task]
4. [Fourth task]

Do not include any other text, explanations, or formatting. Just the 4 numbered tasks.
"""
        
        try:
            response = gemini_service.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse the response to extract tasks
            tasks = []
            lines = response_text.split('\n')
            
            for line in lines:
                line = line.strip()
                # Remove numbering (1., 2., etc.) and clean up
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('*')):
                    # Remove leading number, dot, dash, or asterisk
                    task = line.lstrip('0123456789.-*) ').strip()
                    if task and len(task) > 10:  # Ensure it's a meaningful task
                        tasks.append(task)
            
            # Ensure we have exactly 4 tasks
            if len(tasks) >= 4:
                return tasks[:4]
            elif len(tasks) > 0:
                # Pad with generic tasks if needed
                while len(tasks) < 4:
                    tasks.append(f"Follow up on patient status and review care plan")
                return tasks[:4]
            else:
                # Fallback tasks if parsing fails
                return PatientTaskService._get_fallback_tasks()
                
        except Exception as e:
            print(f"Error generating tasks with AI: {e}")
            return PatientTaskService._get_fallback_tasks()
    
    @staticmethod
    def _get_fallback_tasks() -> list[str]:
        """Fallback tasks if AI generation fails"""
        return [
            "Review patient's latest vital signs and lab results",
            "Follow up on current medication adherence and side effects",
            "Schedule next appointment and necessary follow-up tests",
            "Update care plan based on recent clinical findings"
        ]
    
    @staticmethod
    def create_tasks_for_patient(
        db: Session,
        patient_user_id: int,
        current_user: User
    ) -> TaskGroupResponse:
        """
        Generate and save 4 AI-generated tasks for a patient.
        Only allowed if all current tasks are completed.
        """
        
        # Verify user role
        if current_user.role.name not in ["Doctor", "Receptionist", "Staff", "Hospital_Admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only doctors and staff can generate patient tasks"
            )
        
        # Check if new tasks can be generated
        if not PatientTaskService.can_generate_new_tasks(db, patient_user_id):
            raise HTTPException(
                status_code=400,
                detail="Cannot generate new tasks. Please complete all current tasks first."
            )
        
        # Get patient context
        patient_context = PatientTaskService.get_patient_context(db, patient_user_id)
        
        # Generate tasks using AI
        task_descriptions = PatientTaskService.generate_tasks_with_ai(patient_context)
        
        # Create a new task group ID
        task_group_id = str(uuid.uuid4())
        
        # Save tasks to database
        created_tasks = []
        for i, description in enumerate(task_descriptions, start=1):
            task = PatientTask(
                patient_user_id=patient_user_id,
                task_description=description,
                is_completed=False,
                created_by_user_id=current_user.id,
                task_group_id=task_group_id,
                task_order=i
            )
            db.add(task)
            created_tasks.append(task)
        
        db.commit()
        
        # Refresh all tasks
        for task in created_tasks:
            db.refresh(task)
        
        return TaskGroupResponse(
            task_group_id=task_group_id,
            tasks=[PatientTaskResponse.from_orm(task) for task in created_tasks],
            all_completed=False,
            created_at=created_tasks[0].created_at
        )
    
    @staticmethod
    def get_patient_tasks(
        db: Session,
        patient_user_id: int,
        current_user: User
    ) -> TaskGroupResponse:
        """
        Get the current task group for a patient.
        Returns the most recent task group.
        """
        
        # Verify user role
        if current_user.role.name not in ["Doctor", "Receptionist", "Staff", "Hospital_Admin", "Patient"]:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized to view patient tasks"
            )
        
        # Get the most recent task group
        latest_task = db.query(PatientTask).filter(
            PatientTask.patient_user_id == patient_user_id
        ).order_by(PatientTask.created_at.desc()).first()
        
        if not latest_task:
            raise HTTPException(
                status_code=404,
                detail="No tasks found for this patient"
            )
        
        # Get all tasks in the group
        tasks = db.query(PatientTask).filter(
            PatientTask.task_group_id == latest_task.task_group_id
        ).order_by(PatientTask.task_order).all()
        
        all_completed = all(task.is_completed for task in tasks)
        
        return TaskGroupResponse(
            task_group_id=latest_task.task_group_id,
            tasks=[PatientTaskResponse.from_orm(task) for task in tasks],
            all_completed=all_completed,
            created_at=latest_task.created_at
        )
    
    @staticmethod
    def update_task_status(
        db: Session,
        task_id: int,
        is_completed: bool,
        current_user: User
    ) -> PatientTaskResponse:
        """
        Mark a task as completed or incomplete.
        """
        
        # Verify user role
        if current_user.role.name not in ["Doctor", "Receptionist", "Staff", "Hospital_Admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only doctors and staff can update task status"
            )
        
        task = db.query(PatientTask).filter(PatientTask.id == task_id).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task.is_completed = is_completed
        task.completed_at = datetime.utcnow() if is_completed else None
        
        db.commit()
        db.refresh(task)
        
        return PatientTaskResponse.from_orm(task)
