from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime

class DischargeSummary(Base):
    __tablename__ = "discharge_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Patient reference
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient = relationship("User", foreign_keys=[patient_user_id])
    
    # Hospital reference
    hospital_id = Column(Integer, ForeignKey('hospitals.id'), nullable=False)
    hospital = relationship("Hospital")
    
    # Doctor who created the summary
    created_by_doctor_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by_doctor = relationship("User", foreign_keys=[created_by_doctor_id])
    
    # Dates
    admission_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime, nullable=False)
    
    # Summary content
    chief_complaint = Column(Text, nullable=True)
    history_of_present_illness = Column(Text, nullable=True)
    past_medical_history = Column(Text, nullable=True)
    medications_on_admission = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    
    # Physical examination
    physical_examination = Column(Text, nullable=True)
    vital_signs = Column(Text, nullable=True)
    
    # Hospital course
    hospital_course = Column(Text, nullable=True)
    procedures_performed = Column(Text, nullable=True)
    
    # Lab results summary
    lab_results_summary = Column(Text, nullable=True)
    
    # Diagnosis
    primary_diagnosis = Column(Text, nullable=True)
    secondary_diagnosis = Column(Text, nullable=True)
    
    # Discharge information
    condition_on_discharge = Column(String, nullable=True)  # Stable, Improved, etc.
    discharge_medications = Column(Text, nullable=True)
    discharge_instructions = Column(Text, nullable=True)
    follow_up_instructions = Column(Text, nullable=True)
    diet_instructions = Column(Text, nullable=True)
    activity_restrictions = Column(Text, nullable=True)
    
    # Additional notes
    complications = Column(Text, nullable=True)
    consultations = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)
    
    # File paths for generated documents
    pdf_file_path = Column(String, nullable=True)
    word_file_path = Column(String, nullable=True)
    
    # E-Signatures (store user IDs who signed)
    signed_by_doctor_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    signed_by_doctor = relationship("User", foreign_keys=[signed_by_doctor_id])
    signed_by_staff_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    signed_by_staff = relationship("User", foreign_keys=[signed_by_staff_id])
    signed_by_admin_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    signed_by_admin = relationship("User", foreign_keys=[signed_by_admin_id])
    
    doctor_signed_at = Column(DateTime, nullable=True)
    staff_signed_at = Column(DateTime, nullable=True)
    admin_signed_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_finalized = Column(Boolean, default=False)  # Once finalized, cannot be edited
