# backend/schemas/invoice_schema.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class InvoiceItemResponse(BaseModel):
    """Individual line item in an invoice"""
    description: str
    icd_code: Optional[str] = None
    icd_description: Optional[str] = None
    service_date: datetime
    quantity: int
    unit_price: float
    amount: float
    
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    """Invoice summary response"""
    id: int
    invoice_number: str
    patient_name: str
    patient_email: Optional[str] = None
    hospital_name: str
    hospital_address: Optional[str] = None
    issue_date: datetime
    due_date: datetime
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    status: str
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class InvoiceDetailResponse(InvoiceResponse):
    """Detailed invoice with line items"""
    items: List[InvoiceItemResponse] = []
    
    class Config:
        from_attributes = True

class InvoiceGenerateRequest(BaseModel):
    """Request to generate invoice for a patient"""
    patient_user_id: int
    appointment_id: Optional[int] = None  # If provided, generate invoice for specific appointment
    notes: Optional[str] = None
