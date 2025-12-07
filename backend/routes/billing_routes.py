# backend/routes/billing_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db.db import get_db
from models.user_model import User
from utils.dependencies import get_current_user
from services import billing_service
from schemas.billing_schema import (
    BillCreate, BillResponse, BillDetailResponse,
    BillPaymentRequest, BillPaymentResponse,
    StripePaymentIntentRequest, StripePaymentIntentResponse,
    BillUpdateRequest
)
from utils.stripe_utils import get_publishable_key

router = APIRouter()

@router.post("/generate", response_model=BillDetailResponse, tags=["Billing"])
def generate_bill_for_patient(
    bill_data: BillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a bill for a self-pay patient using their user_id.
    
    This endpoint creates a bill for appointments with ICD codes that haven't been billed yet.
    Each appointment will be added as a line item with a randomly generated amount.
    
    **Access**: Hospital Admin, Receptionist, Staff
    
    **Request Body**:
    - patient_user_id: The user_id from the users table (not patient_profile_id)
    - notes: Optional notes for the bill
    
    **Requirements**:
    - Patient must have billing_type = "self-pay"
    - Patient must have at least one unbilled appointment with an ICD code
    
    **Smart Billing**:
    - Automatically skips appointments that already have bills
    - Only bills new/unbilled appointments
    - Can be called multiple times as new appointments are added
    - Logs information about skipped appointments
    
    **Returns**: Complete bill with all line items for newly billed appointments
    """
    return billing_service.generate_bill_for_patient(db, bill_data, current_user)

@router.get("/", response_model=List[BillResponse], tags=["Billing"])
def get_all_bills(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all bills based on user role.
    
    **Access**:
    - Hospital Admin/Staff: See all bills in their hospital
    - Patients: See only their own bills
    
    **Pagination**: Use skip and limit parameters
    """
    return billing_service.get_bills(db, current_user, skip, limit)

@router.get("/{bill_id}", response_model=BillDetailResponse, tags=["Billing"])
def get_bill_details(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific bill including all line items.
    
    **Access**:
    - Hospital Admin/Staff: Can view bills from their hospital
    - Patients: Can only view their own bills
    
    **Returns**: Complete bill details with line items, patient name, and hospital name
    """
    return billing_service.get_bill_by_id(db, bill_id, current_user)

@router.post("/payment-intent", response_model=StripePaymentIntentResponse, tags=["Billing", "Payment"])
def create_payment_intent(
    request: StripePaymentIntentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe payment intent for a bill.
    
    This endpoint creates a payment intent that can be used with Stripe's frontend
    libraries to collect payment information securely.
    
    **Access**: Patient (for their own bills) or Hospital Staff
    
    **Process**:
    1. Call this endpoint to get a client_secret
    2. Use the client_secret with Stripe.js on the frontend
    3. After successful payment, call the /bills/{bill_id}/pay endpoint
    
    **Returns**: Payment intent details including client_secret for frontend
    """
    return billing_service.create_payment_intent_for_bill(db, request, current_user)

@router.post("/{bill_id}/pay", response_model=BillPaymentResponse, tags=["Billing", "Payment"])
def pay_bill(
    bill_id: int,
    payment_request: BillPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a bill payment via Stripe.
    
    This endpoint should be called after the payment has been confirmed on the frontend
    using Stripe.js. It verifies the payment and updates the bill status.
    
    **Access**: Patient (for their own bills)
    
    **Payment Flow**:
    1. Create payment intent using /bills/payment-intent
    2. Confirm payment on frontend with Stripe.js
    3. Call this endpoint to finalize the payment in the system
    
    **Supports**:
    - Full payment (pay entire outstanding amount)
    - Partial payment (pay a portion of the outstanding amount)
    
    **Returns**: Payment confirmation with updated bill status
    """
    return billing_service.process_bill_payment(db, bill_id, payment_request, current_user)

@router.put("/{bill_id}", response_model=BillDetailResponse, tags=["Billing"])
def update_bill_details(
    bill_id: int,
    update_data: BillUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update bill details (admin only).
    
    **Access**: Hospital Admin, Receptionist, Staff
    
    **Updatable Fields**:
    - status: Change bill status (pending, paid, overdue, cancelled, partially_paid)
    - notes: Add or update notes
    - due_date: Change the due date
    
    **Returns**: Updated bill details
    """
    return billing_service.update_bill(db, bill_id, update_data, current_user)

@router.delete("/{bill_id}", tags=["Billing"])
def delete_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a bill (admin only).
    
    **Access**: Hospital Admin only
    
    **Restrictions**:
    - Cannot delete paid bills
    - Can only delete bills from your own hospital
    
    **Returns**: Success message
    """
    return billing_service.delete_bill(db, bill_id, current_user)

@router.get("/patient/my-bills", response_model=List[BillResponse], tags=["Billing", "Patient"])
def get_my_bills(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all bills for the currently authenticated patient.
    
    This is a patient-specific endpoint that returns only the bills
    belonging to the authenticated patient user.
    
    **Access**: Patient only
    
    **Returns**: List of patient's bills with full details including:
    - Bill number and status
    - Total, paid, and outstanding amounts
    - Due dates and payment information
    - Patient name (their own name)
    
    **Pagination**: Use skip and limit parameters
    
    **Example Use Case**: Patient dashboard showing billing history
    """
    # Verify user is a patient
    if current_user.role.name != "Patient":
        raise HTTPException(
            status_code=403, 
            detail="This endpoint is only accessible to patients. Use /bills/ for admin access."
        )
    
    return billing_service.get_bills(db, current_user, skip, limit)

@router.get("/patient/summary", tags=["Billing", "Patient"])
def get_patient_billing_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a summary of the patient's billing information.
    
    This endpoint provides an overview of the patient's financial status
    including total outstanding, paid amounts, and bill counts by status.
    
    **Access**: Patient only
    
    **Returns**: Summary object with:
    - total_bills: Total number of bills
    - total_amount: Sum of all bill amounts
    - total_paid: Total amount paid
    - total_outstanding: Total amount still owed
    - bills_by_status: Count of bills in each status
    - overdue_count: Number of overdue bills
    - next_due_date: Date of the next bill due
    
    **Example Use Case**: Patient dashboard summary widget
    """
    # Verify user is a patient
    if current_user.role.name != "Patient":
        raise HTTPException(
            status_code=403, 
            detail="This endpoint is only accessible to patients"
        )
    
    return billing_service.get_patient_billing_summary(db, current_user)

@router.get("/patient/bills/{bill_id}", response_model=BillDetailResponse, tags=["Billing", "Patient"])
def get_my_bill_details(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific bill (patient-specific endpoint).
    
    This is a convenience endpoint for patients to view their bill details.
    It's functionally identical to GET /bills/{bill_id} but provides clearer
    routing for patient-facing applications.
    
    **Access**: Patient only (for their own bills)
    
    **Returns**: Complete bill details including:
    - All line items with ICD codes and descriptions
    - Service dates and amounts
    - Payment history
    - Hospital information
    
    **Example Use Case**: Patient viewing detailed bill breakdown before payment
    """
    # Verify user is a patient
    if current_user.role.name != "Patient":
        raise HTTPException(
            status_code=403, 
            detail="This endpoint is only accessible to patients. Use /bills/{bill_id} for admin access."
        )
    
    return billing_service.get_bill_by_id(db, bill_id, current_user)

@router.post("/send-reminder/{patient_user_id}", tags=["Billing", "Admin"])
def send_billing_reminder_to_patient(
    patient_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a billing reminder email to a patient about their pending bills.
    
    This endpoint sends a beautifully formatted email to the patient with:
    - List of all pending/partially paid bills
    - Total outstanding amount
    - Due dates and overdue warnings
    - Bill details including services
    
    **Access**: Hospital Admin, Receptionist, Staff
    
    **Path Parameters**:
    - patient_user_id: The user_id of the patient (from users table)
    
    **Requirements**:
    - Patient must exist in your hospital
    - Patient must have an email address
    - Patient must have at least one pending bill
    
    **Email Contents**:
    - Professional HTML email with hospital branding
    - Individual bill cards with amounts and due dates
    - Overdue warnings for late bills
    - Total outstanding balance
    - Link to patient portal (if configured)
    
    **Returns**: Confirmation with email details
    
    **Example Response**:
    ```json
    {
      "success": true,
      "message": "Billing reminder sent successfully to patient@email.com",
      "patient_name": "John Doe",
      "patient_email": "patient@email.com",
      "bills_count": 3,
      "total_outstanding": 1250.75,
      "overdue_count": 1
    }
    ```
    
    **Use Cases**:
    - Send reminder before due date
    - Follow up on overdue bills
    - Batch reminders for all patients with pending bills
    """
    return billing_service.send_billing_reminder(db, patient_user_id, current_user)

@router.get("/config/stripe-key", tags=["Billing", "Payment"])
def get_stripe_publishable_key():
    """
    Get the Stripe publishable key for frontend integration.
    
    This key is safe to expose to the frontend and is required for
    initializing Stripe.js.
    
    **Access**: Public (no authentication required)
    
    **Returns**: Stripe publishable key
    """
    try:
        publishable_key = get_publishable_key()
        return {"publishable_key": publishable_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
