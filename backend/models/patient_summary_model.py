from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime

class PatientSummary(Base):
    __tablename__ = "patient_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Patient reference
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient = relationship("User", foreign_keys=[patient_user_id])
    
    # Doctor who created the summary
    doctor_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    doctor = relationship("User", foreign_keys=[doctor_user_id])
    
    # Hospital reference
    hospital_id = Column(Integer, ForeignKey('hospitals.id'), nullable=False)
    hospital = relationship("Hospital")
    
    # Summary title and date
    title = Column(String, nullable=False)  # e.g., "Visit Summary - October 16, 2025"
    summary_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # AI-Generated Patient-Friendly Content
    ai_generated_summary = Column(Text, nullable=True)  # Full Gemini response
    
    # Structured patient-friendly sections (AI-generated)
    what_we_found = Column(Text, nullable=True)  # What the doctor found
    what_it_means = Column(Text, nullable=True)  # Explanation in simple terms
    your_diagnosis = Column(Text, nullable=True)  # Diagnosis in plain language
    your_treatment_plan = Column(Text, nullable=True)  # Treatment explained simply
    your_medications = Column(Text, nullable=True)  # Medications with simple instructions
    what_to_watch_for = Column(Text, nullable=True)  # Warning signs in plain language
    next_steps = Column(Text, nullable=True)  # What to do next
    lifestyle_tips = Column(Text, nullable=True)  # Lifestyle recommendations
    questions_to_ask = Column(Text, nullable=True)  # Common questions answered
    
    # Doctor's additional notes (optional)
    doctor_notes = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    
    # Generated documents
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
    
    # Patient engagement
    is_viewed_by_patient = Column(Boolean, default=False)
    viewed_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
