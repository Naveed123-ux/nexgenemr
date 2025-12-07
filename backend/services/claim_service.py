from sqlalchemy.orm import Session, joinedload
from models.claim_model import Claim, ClaimStatus
from schemas.claim_schema import ClaimUpdate, ClaimDecline, ClaimWithICDDescription
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.user_model import User
from models.icd_code_model import ICDCode
import random
import uuid
from datetime import date, timedelta
import logging
from fastapi import HTTPException 
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_claims_for_patient(db: Session, patient_id: int):
    # Step 1: Find the patient and their insurance info
    patient_profile = db.query(PatientProfile).options(joinedload(PatientProfile.user)).filter(PatientProfile.user_id == patient_id).first()
    if not patient_profile:
        logger.warning(f"Patient profile not found for patient_id: {patient_id}")
        raise ValueError("Patient not found.")
    
    if not hasattr(patient_profile, 'insurer_name') or not patient_profile.insurer_name:
        logger.warning(f"Patient with id: {patient_id} does not have an insurer name on file.")
        raise ValueError("Patient does not have an insurer name on file.")

    # Step 2: Find all appointments for the patient
    appointments = db.query(Appointment).options(
        joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        joinedload(Appointment.icd_code)
    ).filter(Appointment.patient_profile_id == patient_profile.id).all()

    if not appointments:
        logger.info(f"No appointments found for patient_id: {patient_id}")
        raise ValueError("No appointments found for this patient.")

    # Step 3: Get all existing claims for these appointments in a single query
    appointment_ids = [appt.id for appt in appointments]
    existing_claims = db.query(Claim).filter(Claim.appointment_id.in_(appointment_ids)).all()
    claimed_appointment_ids = {claim.appointment_id for claim in existing_claims}

    new_claims = []
    skipped_appointments = 0
    skipped_due_to_existing_claim = 0

    for appt in appointments:
        # Step 4: Check if a claim already exists for the appointment
        if appt.id in claimed_appointment_ids:
            skipped_due_to_existing_claim += 1
            continue

        # Step 5: Add checks to ensure related data exists
        if not appt.icd_code or not appt.icd_code.code:
            logger.warning(f"Skipping appointment {appt.id} due to missing ICD code.")
            skipped_appointments += 1
            continue

        if not appt.doctor or not appt.doctor.first_name or not appt.doctor.last_name:
            logger.warning(f"Skipping appointment {appt.id} due to missing doctor information.")
            skipped_appointments += 1
            continue
            
        doctor_name = f"Dr. {appt.doctor.first_name} {appt.doctor.last_name}"
        patient_name = f"{patient_profile.user.first_name} {patient_profile.user.last_name}"

        new_claim = Claim(
            patient_name=patient_name,
            code=appt.icd_code.code,
            doctor_info=doctor_name,
            due_date=date.today() + timedelta(days=30),
            amount=round(random.uniform(100.0, 1000.0), 2),
            insurance_company=patient_profile.insurer_name,
            appointment_id=appt.id
        )
        new_claims.append(new_claim)

    if not new_claims:
        raise ValueError("No new billable appointments found for this patient.")

    # Step 6: Add all new claims to the database
    db.add_all(new_claims)
    db.commit()
    
    return {
        "message": f"Successfully generated {len(new_claims)} claims for patient ID {patient_id}. "
                   f"Skipped {skipped_appointments} appointments due to missing data. "
                   f"Skipped {skipped_due_to_existing_claim} appointments because claims already exist."
    }


def get_claims(db: Session, skip: int = 0, limit: int = 100):
    """
    Get all claims with ICD code descriptions included
    """
    claims = db.query(Claim).offset(skip).limit(limit).all()
    
    # Get all unique ICD codes from the claims
    icd_codes = {claim.code for claim in claims if claim.code}
    
    # Fetch ICD descriptions in one query
    icd_descriptions = {}
    if icd_codes:
        icd_records = db.query(ICDCode).filter(ICDCode.code.in_(icd_codes)).all()
        icd_descriptions = {icd.code: icd.description for icd in icd_records}
    
    # Transform claims to include ICD descriptions
    enhanced_claims = []
    for claim in claims:
        icd_description = icd_descriptions.get(claim.code, "Description not found")
        
        enhanced_claim = ClaimWithICDDescription(
            id=claim.id,
            patient_name=claim.patient_name,
            code=claim.code,
            doctor_info=claim.doctor_info,
            due_date=claim.due_date,
            amount=claim.amount,
            insurance_company=claim.insurance_company,
            appointment_id=claim.appointment_id,
            status=claim.status.value if hasattr(claim.status, 'value') else str(claim.status),
            reason_for_denial=claim.reason_for_denial,
            icd_description=icd_description
        )
        enhanced_claims.append(enhanced_claim)
    
    return enhanced_claims


def update_claim_status(db: Session, claim_id: int, claim_update: ClaimUpdate):
    db_claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if db_claim:
        db_claim.status = claim_update.status
        if claim_update.status == "declined":
            if not claim_update.reason_for_denial:
                raise ValueError("Reason for denial is required when declining a claim.")
            db_claim.reason_for_denial = claim_update.reason_for_denial
        else:
            db_claim.reason_for_denial = None

        db.commit()
        db.refresh(db_claim)

        if db_claim.status == "paid":
            logger.info(f"Claim {db_claim.id} for {db_claim.patient_name} processed as PAID.")
            # Mock sending claim to insurance
            logger.info(f"Submitting claim to {db_claim.insurance_company} for payment...")

    return db_claim

def check_claim_eligibility(db: Session, claim_id: int):
    """
    Checks the eligibility of a claim by generating a mock response
    that mimics a modern EMR's insurance verification check.
    """
    claim = db.query(Claim).options(joinedload(Claim.appointment)).filter(Claim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found.")

    # Mock data generation
    is_eligible = random.choice([True, False])
    status = "Eligible" if is_eligible else "Ineligible"
    rejection_reason = None
    if not is_eligible:
        rejection_reason = random.choice([
            "Service not covered under patient's plan.",
            "Patient not enrolled on the date of service.",
            "Prior authorization required.",
            "Coverage terminated."
        ])

    # Build the mock JSON response
    eligibility_response = {
        "transactionId": str(uuid.uuid4()),
        "checkDate": date.today().isoformat(),
        "eligibilityStatus": status,
        "patientDetails": {
            "name": claim.patient_name,
            "memberId": f"MBR{random.randint(100000, 999999)}"
        },
        "providerDetails": {
            "name": claim.doctor_info,
            "npi": f"{random.randint(1000000000, 9999999999)}"
        },
        "serviceDetails": {
            "serviceCode": claim.code,
            "serviceDescription": "Office Visit, Established Patient", # Mock description
            "serviceDate": claim.appointment.session.start_time.date().isoformat() if claim.appointment and claim.appointment.session else "N/A"
        },
        "coverageDetails": {
            "planName": claim.insurance_company,
            "coPay": f"${random.choice([25, 50, 75])}.00",
            "deductible": f"${random.choice([500, 1000, 1500])}.00",
            "coInsurance": f"{random.choice([10, 20, 30])}%",
            "limitations": [
                "Coverage subject to plan limitations.",
                "Annual deductible may apply."
            ] if is_eligible else []
        },
        "rejectionReason": rejection_reason
    }

    return eligibility_response

def send_claim_to_payer(db: Session, claim_id: int):
    """
    Simulates sending a claim to a payer. It gathers real data and returns
    a mock confirmation of submission.
    """
    # Simple query first to get the claim
    claim = db.query(Claim).filter(Claim.id == claim_id).first()

    if not claim:
        raise ValueError("Claim not found.")
    
    if claim.status != ClaimStatus.pending:
        raise ValueError(f"Claim cannot be submitted. Current status is '{claim.status.value}'.")

    # Dummy workflow for submission
    logger.info(f"Preparing to submit claim {claim_id} to payer: {claim.insurance_company}")

    # Use mock data for demonstration since this is mock functionality
    patient_dob = f"19{random.randint(70, 99)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
    service_date = date.today().isoformat()
    
    # Try to get real appointment data if available, but don't fail if missing
    try:
        if claim.appointment_id:
            appointment = db.query(Appointment).options(
                joinedload(Appointment.session)
            ).filter(Appointment.id == claim.appointment_id).first()
            
            if appointment and appointment.session:
                service_date = appointment.session.start_time.date().isoformat()
                logger.info(f"Using real service date: {service_date}")
    except Exception as e:
        logger.warning(f"Could not extract appointment details, using mock data: {e}")

    # Construct a simplified payload with real and mock data
    submission_payload = {
        "header": {
            "submissionId": str(uuid.uuid4()),
            "submissionDate": date.today().isoformat()
        },
        "payer": {
            "name": claim.insurance_company,
            "payerId": f"PAYER{random.randint(1000, 9999)}"
        },
        "provider": {
            "name": claim.doctor_info,
            "npi": f"{random.randint(1000000000, 9999999999)}"
        },
        "patient": {
            "name": claim.patient_name,
            "memberId": f"MBR{random.randint(100000, 999999)}",
            "dateOfBirth": patient_dob
        },
        "claimDetails": {
            "claimId": claim.id,
            "serviceDate": service_date,
            "diagnoses": [{"code": claim.code, "type": "ICD-10"}],
            "totalAmount": claim.amount
        }
    }
    
    logger.info("Claim payload constructed:")
    logger.info(submission_payload)
    
    # Mock sending process
    logger.info(f"Transmitting claim {claim.id} via secure channel...")
    # In a real app, this is where you'd make an API call to the payer.
    
    # Mock response from payer
    submission_status = "Accepted"
    confirmation_id = f"CONF-{random.randint(1000000, 9999999)}"
    
    logger.info(f"Claim submission successful. Confirmation ID: {confirmation_id}")

    return {
        "message": f"Claim {claim.id} successfully submitted to {claim.insurance_company}.",
        "submissionStatus": submission_status,
        "confirmationId": confirmation_id,
        "submittedData": submission_payload
    }

def accept_claim(db: Session, claim_id: int):
    """
    Sets a claim's status to 'paid'.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found.")
    
    if claim.status != ClaimStatus.pending:
        raise ValueError(f"Only pending claims can be accepted. Current status: '{claim.status.value}'.")

    claim.status = ClaimStatus.paid
    claim.reason_for_denial = None # Clear any previous denial reason
    db.commit()
    db.refresh(claim)
    
    logger.info(f"Claim {claim_id} has been accepted and status set to PAID.")
    
    return claim

def decline_claim(db: Session, claim_id: int, decline_data: ClaimDecline):
    """
    Sets a claim's status to 'declined' and records a reason.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found.")

    if claim.status != ClaimStatus.pending:
        raise ValueError(f"Only pending claims can be declined. Current status: '{claim.status.value}'.")

    claim.status = ClaimStatus.declined
    claim.reason_for_denial = decline_data.reason_for_denial
    db.commit()
    db.refresh(claim)

    logger.info(f"Claim {claim_id} has been declined. Reason: {decline_data.reason_for_denial}")

    return claim


def delete_claim(db: Session, claim_id: int):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    db.delete(claim)
    db.commit()
    return {"message": "Claim deleted successfully"}