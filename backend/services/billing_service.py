# backend/services/billing_service.py
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from models.billing_model import Bill, BillItem, BillingStatus
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.icd_code_model import ICDCode
from models.user_model import User
from schemas.billing_schema import (
    BillCreate, BillResponse, BillDetailResponse, BillItemResponse,
    BillPaymentRequest, BillPaymentResponse, StripePaymentIntentRequest,
    StripePaymentIntentResponse, BillUpdateRequest
)
from utils.stripe_utils import create_payment_intent, retrieve_payment_intent
from utils.email_utils import send_billing_reminder_email
from datetime import datetime, timedelta
import random
import logging

logger = logging.getLogger(__name__)

def generate_bill_number() -> str:
    """Generate a unique bill number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = random.randint(1000, 9999)
    return f"BILL-{timestamp}-{random_suffix}"

def generate_bill_for_patient(db: Session, bill_data: BillCreate, current_user: User) -> BillDetailResponse:
    """
    Generate a bill for a self-pay patient based on their appointments with ICD codes
    
    Args:
        db: Database session
        bill_data: Bill creation data (uses patient_user_id)
        current_user: Current authenticated user (admin)
    
    Returns:
        BillDetailResponse: Created bill with items
    """
    # Verify user is admin
    user_role = current_user.role.name
    if user_role not in ["Hospital_Admin", "Receptionist", "Staff"]:
        raise HTTPException(status_code=403, detail="Only hospital staff can generate bills")
    
    # Get hospital_id based on user role
    if user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
    elif user_role in ["Receptionist", "Staff"]:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        hospital_id = current_user.staff_profile.hospital_id
    else:
        raise HTTPException(status_code=403, detail="Unable to determine hospital")
    
    # Get patient profile using user_id
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == bill_data.patient_user_id,
        PatientProfile.hospital_id == hospital_id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in your hospital")
    
    # Check if patient is self-pay
    if patient.billing_type.lower() != "self-pay":
        raise HTTPException(
            status_code=400, 
            detail=f"Patient billing type is '{patient.billing_type}'. Bills can only be generated for self-pay patients."
        )
    
    # Get all appointments with ICD codes for this patient
    appointments = db.query(Appointment).options(
        joinedload(Appointment.icd_code),
        joinedload(Appointment.slot)
    ).filter(
        Appointment.patient_profile_id == patient.id,
        Appointment.icd_code_id.isnot(None)  # Only appointments with ICD codes
    ).all()
    
    if not appointments:
        raise HTTPException(
            status_code=400, 
            detail="No appointments with ICD codes found for this patient"
        )
    
    # Filter out appointments that already have bills
    appointment_ids = [apt.id for apt in appointments]
    existing_bill_items = db.query(BillItem).filter(
        BillItem.appointment_id.in_(appointment_ids)
    ).all()
    
    # Get set of appointment IDs that already have bills
    billed_appointment_ids = {item.appointment_id for item in existing_bill_items}
    
    # Filter to only unbilled appointments
    unbilled_appointments = [
        apt for apt in appointments 
        if apt.id not in billed_appointment_ids
    ]
    
    # Check if there are any unbilled appointments
    if not unbilled_appointments:
        raise HTTPException(
            status_code=400,
            detail=f"All appointments for this patient already have bills. No new appointments to bill."
        )
    
    # Log information about skipped appointments
    if billed_appointment_ids:
        logger.info(
            f"Skipping {len(billed_appointment_ids)} already-billed appointments for patient user_id {bill_data.patient_user_id}. "
            f"Billing {len(unbilled_appointments)} new appointments."
        )
    
    # Create bill items and calculate total (only for unbilled appointments)
    bill_items = []
    total_amount = 0.0
    
    for appointment in unbilled_appointments:
        # Generate random amount for the appointment (between $100 and $500)
        amount = round(random.uniform(100.0, 500.0), 2)
        unit_price = amount  # For now, quantity is 1
        
        # Get ICD description
        icd_description = appointment.icd_code.description if appointment.icd_code else "No description"
        icd_code = appointment.icd_code.code if appointment.icd_code else "N/A"
        
        # Get service date
        service_date = appointment.session.start_time if appointment.session else datetime.utcnow()
        
        bill_item = BillItem(
            appointment_id=appointment.id,
            description=f"Medical consultation - {appointment.reason_for_visit or 'General visit'}",
            icd_code=icd_code,
            icd_description=icd_description,
            service_date=service_date,
            amount=amount,
            quantity=1,
            unit_price=unit_price
        )
        
        bill_items.append(bill_item)
        total_amount += amount
    
    # Create the bill
    bill_number = generate_bill_number()
    due_date = datetime.utcnow() + timedelta(days=30)  # 30 days to pay
    
    new_bill = Bill(
        patient_profile_id=patient.id,
        hospital_id=hospital_id,
        bill_number=bill_number,
        total_amount=round(total_amount, 2),
        paid_amount=0.0,
        outstanding_amount=round(total_amount, 2),
        status=BillingStatus.pending,
        issue_date=datetime.utcnow(),
        due_date=due_date,
        notes=bill_data.notes,
        created_by=current_user.id,
        bill_items=bill_items
    )
    
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    
    # Log detailed billing information
    logger.info(
        f"Generated bill {bill_number} for patient user_id {bill_data.patient_user_id} (profile_id {patient.id}). "
        f"Billed {len(bill_items)} new appointments (total: ${total_amount:.2f}). "
        f"Skipped {len(billed_appointment_ids)} already-billed appointments."
    )
    
    # Return detailed response
    return _build_bill_detail_response(db, new_bill)

def get_bills(db: Session, current_user: User, skip: int = 0, limit: int = 100) -> list[BillResponse]:
    """
    Get all bills based on user role with patient names included
    
    Args:
        db: Database session
        current_user: Current authenticated user
        skip: Pagination offset
        limit: Pagination limit
    
    Returns:
        list[BillResponse]: List of bills with patient names
    """
    user_role = current_user.role.name
    
    # Determine hospital_id based on user role
    if user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
        bills = db.query(Bill).options(
            joinedload(Bill.patient).joinedload(PatientProfile.user)
        ).filter(Bill.hospital_id == hospital_id).offset(skip).limit(limit).all()
    
    elif user_role in ["Receptionist", "Staff"]:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        hospital_id = current_user.staff_profile.hospital_id
        bills = db.query(Bill).options(
            joinedload(Bill.patient).joinedload(PatientProfile.user)
        ).filter(Bill.hospital_id == hospital_id).offset(skip).limit(limit).all()
    
    elif user_role == "Patient":
        # Patients can only see their own bills
        if not current_user.patient_profile:
            raise HTTPException(status_code=403, detail="Patient profile not found")
        bills = db.query(Bill).options(
            joinedload(Bill.patient).joinedload(PatientProfile.user)
        ).filter(
            Bill.patient_profile_id == current_user.patient_profile.id
        ).offset(skip).limit(limit).all()
    
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to view bills")
    
    return [_build_bill_response(db, bill) for bill in bills]

def get_bill_by_id(db: Session, bill_id: int, current_user: User) -> BillDetailResponse:
    """
    Get a specific bill by ID with access control
    
    Args:
        db: Database session
        bill_id: Bill ID
        current_user: Current authenticated user
    
    Returns:
        BillDetailResponse: Detailed bill information
    """
    bill = db.query(Bill).options(
        joinedload(Bill.bill_items).joinedload(BillItem.appointment),
        joinedload(Bill.patient).joinedload(PatientProfile.user),
        joinedload(Bill.hospital)
    ).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Access control
    user_role = current_user.role.name
    
    if user_role == "Patient":
        if not current_user.patient_profile or bill.patient_profile_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="You can only view your own bills")
    
    elif user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        if user_role == "Hospital_Admin":
            user_hospital_id = current_user.hospital.id
        else:
            user_hospital_id = current_user.staff_profile.hospital_id if current_user.staff_profile else None
        
        if bill.hospital_id != user_hospital_id:
            raise HTTPException(status_code=403, detail="You can only view bills from your hospital")
    
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to view this bill")
    
    return _build_bill_detail_response(db, bill)

def create_payment_intent_for_bill(
    db: Session, 
    request: StripePaymentIntentRequest, 
    current_user: User
) -> StripePaymentIntentResponse:
    """
    Create a Stripe payment intent for a bill
    
    Args:
        db: Database session
        request: Payment intent request
        current_user: Current authenticated user
    
    Returns:
        StripePaymentIntentResponse: Payment intent details
    """
    # Get the bill
    bill = db.query(Bill).filter(Bill.id == request.bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Verify patient can pay this bill
    if current_user.role.name == "Patient":
        if not current_user.patient_profile or bill.patient_profile_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="You can only pay your own bills")
    
    # Determine amount to charge
    amount = request.amount if request.amount else bill.outstanding_amount
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    if amount > bill.outstanding_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Amount exceeds outstanding balance of ${bill.outstanding_amount}"
        )
    
    # Create payment intent
    try:
        payment_intent = create_payment_intent(
            amount=amount,
            metadata={
                "bill_id": str(bill.id),
                "bill_number": bill.bill_number,
                "patient_profile_id": str(bill.patient_profile_id)
            }
        )
        
        # Update bill with payment intent ID
        bill.stripe_payment_intent_id = payment_intent["id"]
        db.commit()
        
        return StripePaymentIntentResponse(
            client_secret=payment_intent["client_secret"],
            payment_intent_id=payment_intent["id"],
            amount=amount,
            currency="usd"
        )
    
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {str(e)}")

def process_bill_payment(
    db: Session,
    bill_id: int,
    payment_request: BillPaymentRequest,
    current_user: User
) -> BillPaymentResponse:
    """
    Process a bill payment via Stripe
    
    Args:
        db: Database session
        bill_id: Bill ID
        payment_request: Payment request data
        current_user: Current authenticated user
    
    Returns:
        BillPaymentResponse: Payment result
    """
    # Get the bill
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Verify patient can pay this bill
    if current_user.role.name == "Patient":
        if not current_user.patient_profile or bill.patient_profile_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="You can only pay your own bills")
    
    # Check if bill is already paid
    if bill.status == BillingStatus.paid:
        raise HTTPException(status_code=400, detail="Bill is already paid")
    
    # Determine amount to pay
    amount = payment_request.amount if payment_request.amount else bill.outstanding_amount
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    if amount > bill.outstanding_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Amount exceeds outstanding balance of ${bill.outstanding_amount}"
        )
    
    # Retrieve and verify payment intent
    try:
        if not bill.stripe_payment_intent_id:
            raise HTTPException(status_code=400, detail="No payment intent found for this bill")
        
        payment_intent = retrieve_payment_intent(bill.stripe_payment_intent_id)
        
        if payment_intent["status"] != "succeeded":
            raise HTTPException(
                status_code=400,
                detail=f"Payment not completed. Status: {payment_intent['status']}"
            )
        
        # Update bill
        bill.paid_amount += amount
        bill.outstanding_amount -= amount
        bill.payment_method = "stripe"
        bill.stripe_charge_id = payment_intent.get("charge_id")
        
        # Update status
        if bill.outstanding_amount <= 0:
            bill.status = BillingStatus.paid
            bill.paid_date = datetime.utcnow()
        else:
            bill.status = BillingStatus.partially_paid
        
        bill.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(bill)
        
        logger.info(f"Processed payment of ${amount} for bill {bill.bill_number}")
        
        return BillPaymentResponse(
            success=True,
            message="Payment processed successfully",
            bill_id=bill.id,
            amount_paid=amount,
            outstanding_amount=bill.outstanding_amount,
            status=bill.status.value,
            stripe_payment_intent_id=bill.stripe_payment_intent_id,
            stripe_charge_id=bill.stripe_charge_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")

def update_bill(
    db: Session,
    bill_id: int,
    update_data: BillUpdateRequest,
    current_user: User
) -> BillDetailResponse:
    """
    Update bill details (admin only)
    
    Args:
        db: Database session
        bill_id: Bill ID
        update_data: Update data
        current_user: Current authenticated user
    
    Returns:
        BillDetailResponse: Updated bill
    """
    # Verify user is admin
    user_role = current_user.role.name
    if user_role not in ["Hospital_Admin", "Receptionist", "Staff"]:
        raise HTTPException(status_code=403, detail="Only hospital staff can update bills")
    
    # Get the bill
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Verify hospital access
    if user_role == "Hospital_Admin":
        user_hospital_id = current_user.hospital.id
    else:
        user_hospital_id = current_user.staff_profile.hospital_id if current_user.staff_profile else None
    
    if bill.hospital_id != user_hospital_id:
        raise HTTPException(status_code=403, detail="You can only update bills from your hospital")
    
    # Update fields
    if update_data.status:
        try:
            bill.status = BillingStatus[update_data.status]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {update_data.status}")
    
    if update_data.notes is not None:
        bill.notes = update_data.notes
    
    if update_data.due_date:
        bill.due_date = update_data.due_date
    
    bill.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(bill)
    
    logger.info(f"Updated bill {bill.bill_number}")
    
    return _build_bill_detail_response(db, bill)

def get_patient_billing_summary(db: Session, current_user: User) -> dict:
    """
    Get a summary of the patient's billing information
    
    Args:
        db: Database session
        current_user: Current authenticated patient user
    
    Returns:
        dict: Summary of patient's billing status
    """
    # Verify user is a patient
    if current_user.role.name != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can access billing summary")
    
    if not current_user.patient_profile:
        raise HTTPException(status_code=403, detail="Patient profile not found")
    
    # Get all bills for the patient
    bills = db.query(Bill).filter(
        Bill.patient_profile_id == current_user.patient_profile.id
    ).all()
    
    if not bills:
        return {
            "total_bills": 0,
            "total_amount": 0.0,
            "total_paid": 0.0,
            "total_outstanding": 0.0,
            "bills_by_status": {},
            "overdue_count": 0,
            "next_due_date": None,
            "recent_bills": []
        }
    
    # Calculate summary statistics
    total_bills = len(bills)
    total_amount = sum(bill.total_amount for bill in bills)
    total_paid = sum(bill.paid_amount for bill in bills)
    total_outstanding = sum(bill.outstanding_amount for bill in bills)
    
    # Count bills by status
    bills_by_status = {}
    for bill in bills:
        status = bill.status.value
        bills_by_status[status] = bills_by_status.get(status, 0) + 1
    
    # Count overdue bills
    from datetime import datetime
    now = datetime.utcnow()
    overdue_bills = [
        bill for bill in bills 
        if bill.status in [BillingStatus.pending, BillingStatus.partially_paid] 
        and bill.due_date < now
    ]
    overdue_count = len(overdue_bills)
    
    # Find next due date
    pending_bills = [
        bill for bill in bills 
        if bill.status in [BillingStatus.pending, BillingStatus.partially_paid]
        and bill.due_date >= now
    ]
    next_due_date = min([bill.due_date for bill in pending_bills]) if pending_bills else None
    
    # Get recent bills (last 5)
    recent_bills = sorted(bills, key=lambda x: x.created_at, reverse=True)[:5]
    recent_bills_data = [
        {
            "id": bill.id,
            "bill_number": bill.bill_number,
            "amount": bill.total_amount,
            "outstanding": bill.outstanding_amount,
            "status": bill.status.value,
            "due_date": bill.due_date.isoformat() if bill.due_date else None
        }
        for bill in recent_bills
    ]
    
    return {
        "total_bills": total_bills,
        "total_amount": round(total_amount, 2),
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "bills_by_status": bills_by_status,
        "overdue_count": overdue_count,
        "next_due_date": next_due_date.isoformat() if next_due_date else None,
        "recent_bills": recent_bills_data
    }

def send_billing_reminder(db: Session, patient_user_id: int, current_user: User) -> dict:
    """
    Send a billing reminder email to a patient with their pending bills
    
    Args:
        db: Database session
        patient_user_id: Patient's user ID
        current_user: Current authenticated user (admin)
    
    Returns:
        dict: Success message with email details
    """
    # Verify user is admin
    user_role = current_user.role.name
    if user_role not in ["Hospital_Admin", "Receptionist", "Staff"]:
        raise HTTPException(status_code=403, detail="Only hospital staff can send billing reminders")
    
    # Get hospital_id based on user role
    if user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
    elif user_role in ["Receptionist", "Staff"]:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        hospital_id = current_user.staff_profile.hospital_id
    else:
        raise HTTPException(status_code=403, detail="Unable to determine hospital")
    
    # Get patient profile using user_id
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == patient_user_id,
        PatientProfile.hospital_id == hospital_id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in your hospital")
    
    # Get patient user details
    patient_user = db.query(User).filter(User.id == patient_user_id).first()
    
    if not patient_user:
        raise HTTPException(status_code=404, detail="Patient user not found")
    
    if not patient_user.email:
        raise HTTPException(status_code=400, detail="Patient does not have an email address")
    
    # Get all pending/partially paid bills for the patient
    bills = db.query(Bill).options(
        joinedload(Bill.bill_items)
    ).filter(
        Bill.patient_profile_id == patient.id,
        Bill.status.in_([BillingStatus.pending, BillingStatus.partially_paid, BillingStatus.overdue])
    ).all()
    
    if not bills:
        raise HTTPException(status_code=400, detail="Patient has no pending bills")
    
    # Calculate totals and prepare bill data for email
    total_outstanding = 0.0
    overdue_count = 0
    now = datetime.utcnow()
    
    bills_data = []
    for bill in bills:
        is_overdue = bill.due_date < now and bill.status in [BillingStatus.pending, BillingStatus.partially_paid]
        if is_overdue:
            overdue_count += 1
        
        # Get services summary from bill items
        services = []
        for item in bill.bill_items[:3]:  # Show first 3 services
            services.append(item.description)
        services_summary = ", ".join(services)
        if len(bill.bill_items) > 3:
            services_summary += f" (+{len(bill.bill_items) - 3} more)"
        
        bills_data.append({
            "bill_number": bill.bill_number,
            "amount": bill.outstanding_amount,
            "due_date": bill.due_date.strftime("%B %d, %Y"),
            "status": bill.status.value,
            "is_overdue": is_overdue,
            "services_summary": services_summary
        })
        
        total_outstanding += bill.outstanding_amount
    
    # Send email
    patient_name = f"{patient_user.first_name} {patient_user.last_name}"
    
    try:
        email_sent = send_billing_reminder_email(
            recipient_email=patient_user.email,
            patient_name=patient_name,
            bills=bills_data,
            total_outstanding=total_outstanding,
            overdue_count=overdue_count
        )
        
        if email_sent:
            logger.info(
                f"Billing reminder sent to {patient_user.email} for patient user_id {patient_user_id}. "
                f"{len(bills)} bill(s), total outstanding: ${total_outstanding:.2f}, overdue: {overdue_count}"
            )
            
            return {
                "success": True,
                "message": f"Billing reminder sent successfully to {patient_user.email}",
                "patient_name": patient_name,
                "patient_email": patient_user.email,
                "bills_count": len(bills),
                "total_outstanding": round(total_outstanding, 2),
                "overdue_count": overdue_count
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send email. Check email configuration.")
    
    except Exception as e:
        logger.error(f"Error sending billing reminder to patient user_id {patient_user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send billing reminder: {str(e)}")

def delete_bill(db: Session, bill_id: int, current_user: User) -> dict:
    """
    Delete a bill (admin only, only if not paid)
    
    Args:
        db: Database session
        bill_id: Bill ID
        current_user: Current authenticated user
    
    Returns:
        dict: Success message
    """
    # Verify user is admin
    user_role = current_user.role.name
    if user_role not in ["Hospital_Admin"]:
        raise HTTPException(status_code=403, detail="Only hospital admins can delete bills")
    
    # Get the bill
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Verify hospital access
    if bill.hospital_id != current_user.hospital.id:
        raise HTTPException(status_code=403, detail="You can only delete bills from your hospital")
    
    # Check if bill is paid
    if bill.status == BillingStatus.paid:
        raise HTTPException(status_code=400, detail="Cannot delete a paid bill")
    
    db.delete(bill)
    db.commit()
    
    logger.info(f"Deleted bill {bill.bill_number}")
    
    return {"message": f"Bill {bill.bill_number} deleted successfully"}

# Helper functions

def _build_bill_response(db: Session, bill: Bill) -> BillResponse:
    """Build a BillResponse from a Bill model with patient name"""
    # Get patient_user_id and patient_name from patient profile
    patient_user_id = None
    patient_name = None
    
    if bill.patient:
        patient_user_id = bill.patient.user_id
        # Get patient user details
        patient_user = db.query(User).filter(User.id == bill.patient.user_id).first()
        if patient_user:
            patient_name = f"{patient_user.first_name} {patient_user.last_name}"
    
    return BillResponse(
        id=bill.id,
        patient_user_id=patient_user_id,
        patient_profile_id=bill.patient_profile_id,
        patient_name=patient_name,
        hospital_id=bill.hospital_id,
        bill_number=bill.bill_number,
        total_amount=bill.total_amount,
        paid_amount=bill.paid_amount,
        outstanding_amount=bill.outstanding_amount,
        status=bill.status.value,
        issue_date=bill.issue_date,
        due_date=bill.due_date,
        paid_date=bill.paid_date,
        payment_method=bill.payment_method,
        notes=bill.notes,
        created_at=bill.created_at,
        updated_at=bill.updated_at
    )

def _build_bill_detail_response(db: Session, bill: Bill) -> BillDetailResponse:
    """Build a BillDetailResponse from a Bill model with items"""
    # Get patient name and user_id
    patient_name = None
    patient_user_id = None
    if bill.patient:
        patient_user_id = bill.patient.user_id
        patient_user = db.query(User).filter(User.id == bill.patient.user_id).first()
        if patient_user:
            patient_name = f"{patient_user.first_name} {patient_user.last_name}"
    
    # Get hospital name
    hospital_name = bill.hospital.name if bill.hospital else None
    
    # Build bill items
    bill_items = [
        BillItemResponse(
            id=item.id,
            bill_id=item.bill_id,
            appointment_id=item.appointment_id,
            description=item.description,
            icd_code=item.icd_code,
            icd_description=item.icd_description,
            service_date=item.service_date,
            amount=item.amount,
            quantity=item.quantity,
            unit_price=item.unit_price,
            created_at=item.created_at
        )
        for item in bill.bill_items
    ]
    
    return BillDetailResponse(
        id=bill.id,
        patient_user_id=patient_user_id,
        patient_profile_id=bill.patient_profile_id,
        hospital_id=bill.hospital_id,
        bill_number=bill.bill_number,
        total_amount=bill.total_amount,
        paid_amount=bill.paid_amount,
        outstanding_amount=bill.outstanding_amount,
        status=bill.status.value,
        issue_date=bill.issue_date,
        due_date=bill.due_date,
        paid_date=bill.paid_date,
        payment_method=bill.payment_method,
        notes=bill.notes,
        created_at=bill.created_at,
        updated_at=bill.updated_at,
        bill_items=bill_items,
        patient_name=patient_name,
        hospital_name=hospital_name
    )
