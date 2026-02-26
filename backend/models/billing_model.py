# backend/models/billing_model.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.db import Base
from datetime import datetime
import enum

class BillingStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"
    partially_paid = "partially_paid"

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    
    # Patient information
    patient_profile_id = Column(Integer, ForeignKey('patient_profiles.id'), nullable=False)
    patient = relationship("PatientProfile", foreign_keys=[patient_profile_id])
    
    # Hospital information
    hospital_id = Column(Integer, ForeignKey('hospitals.id'), nullable=False)
    hospital = relationship("Hospital")
    
    # Billing details
    bill_number = Column(String, unique=True, index=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    outstanding_amount = Column(Float, nullable=False)
    
    # Status and dates
    status = Column(Enum(BillingStatus), default=BillingStatus.pending, nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    
    # Payment information
    stripe_payment_intent_id = Column(String, nullable=True)
    stripe_charge_id = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)  # 'stripe', 'cash', 'check', etc.
    
    # Additional information
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bill_items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Bill reference
    bill_id = Column(Integer, ForeignKey('bills.id'), nullable=False)
    bill = relationship("Bill", back_populates="bill_items")
    
    # Linked items (Appointment OR Lab Request)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    appointment = relationship("Appointment")
    
    lab_request_id = Column(Integer, ForeignKey('lab_requests.id'), nullable=True)
    lab_request = relationship("LabRequest")
    
    # Item details
    description = Column(String, nullable=False)
    icd_code = Column(String, nullable=True)
    icd_description = Column(Text, nullable=True)
    service_date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    
    # Additional information
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
