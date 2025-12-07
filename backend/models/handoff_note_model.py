from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime

class HandoffNote(Base):
    __tablename__ = "handoff_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Patient reference
    patient_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient = relationship("User", foreign_keys=[patient_user_id])
    
    # Hospital reference
    hospital_id = Column(Integer, ForeignKey('hospitals.id'), nullable=False)
    hospital = relationship("Hospital")
    
    # Staff member who created the handoff
    created_by_staff_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by_staff = relationship("User", foreign_keys=[created_by_staff_id])
    
    # Handoff details
    handoff_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    shift_from = Column(String, nullable=True)  # e.g., "Day Shift", "Night Shift"
    shift_to = Column(String, nullable=True)
    
    # AI-Generated Content
    ai_generated_summary = Column(Text, nullable=True)  # Gemini-generated summary
    
    # Structured handoff sections (AI-generated)
    patient_overview = Column(Text, nullable=True)
    current_condition = Column(Text, nullable=True)
    active_problems = Column(Text, nullable=True)
    recent_changes = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    pending_tasks = Column(Text, nullable=True)
    important_alerts = Column(Text, nullable=True)
    care_plan = Column(Text, nullable=True)
    family_communication = Column(Text, nullable=True)
    
    # Manual additions (staff can add)
    additional_notes = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    
    # Patient context used for generation (stored for reference)
    patient_context_snapshot = Column(Text, nullable=True)  # JSON string
    
    # Generated document
    pdf_file_path = Column(String, nullable=True)
    
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
    is_acknowledged = Column(Boolean, default=False)  # Receiving staff acknowledges
    acknowledged_by_staff_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    
    acknowledged_by_staff = relationship("User", foreign_keys=[acknowledged_by_staff_id])
