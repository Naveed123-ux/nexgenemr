# backend/schemas/billing_schema.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class BillItemBase(BaseModel):
    appointment_id: int
    description: str
    icd_code: Optional[str] = None
    icd_description: Optional[str] = None
    service_date: datetime
    amount: float
    quantity: int = 1
    unit_price: float

class BillItemCreate(BillItemBase):
    pass

class BillItemResponse(BillItemBase):
    id: int
    bill_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BillBase(BaseModel):
    patient_user_id: int
    notes: Optional[str] = None

class BillCreate(BillBase):
    """Request to generate a bill for a patient using their user_id"""
    pass

class BillResponse(BaseModel):
    id: int
    patient_user_id: int
    patient_profile_id: int
    patient_name: Optional[str] = None
    hospital_id: int
    bill_number: str
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    status: str
    issue_date: datetime
    due_date: datetime
    paid_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BillDetailResponse(BillResponse):
    """Detailed bill response with line items"""
    bill_items: List[BillItemResponse] = []
    patient_name: Optional[str] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True

class BillPaymentRequest(BaseModel):
    """Request to pay a bill via Stripe"""
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    amount: Optional[float] = Field(None, description="Amount to pay (if partial payment)")

class BillPaymentResponse(BaseModel):
    success: bool
    message: str
    bill_id: int
    amount_paid: float
    outstanding_amount: float
    status: str
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None

class StripePaymentIntentRequest(BaseModel):
    """Request to create a Stripe payment intent"""
    bill_id: int
    amount: Optional[float] = Field(None, description="Amount to pay (defaults to outstanding amount)")

class StripePaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: float
    currency: str = "usd"

class BillUpdateRequest(BaseModel):
    """Request to update bill details"""
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
