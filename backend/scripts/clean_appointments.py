"""
Script to clean all appointment-related data from the database.

This script will delete:
1. All bill items linked to appointments
2. All prescriptions linked to appointments
3. All claims linked to appointments
4. All vitals linked to appointments
5. All SOAP notes linked to appointments
6. All appointment ICD code associations
7. All appointments
8. All appointment requests
9. Reset all appointment slots to 'Available' status

WARNING: This operation cannot be undone. Use with caution!
"""

import sys
import os

# Add the parent directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from db.db import SessionLocal

# Import ALL models to ensure SQLAlchemy relationships are properly initialized
# This prevents "failed to locate a name" errors during mapper initialization
from models.role_model import Role
from models.permission_model import Permission
from models.user_model import User
from models.hospital_model import Hospital
from models.department_model import Department
from models.patient_profile_model import PatientProfile
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.appointment_model import Appointment
from models.appointment_request_model import AppointmentRequest
from models.appointment_session_model import AppointmentSession
from models.appointment_icd_code_model import AppointmentICDCode
from models.clinical_data_model import Vitals, MedicalHistory
from models.soap_note_model import SoapNote
from models.claim_model import Claim
from models.icd_code_model import ICDCode
from models.google_auth_token_model import GoogleAuthToken
from models.signature_model import UserSignature
from models.prescription_model import Prescription
from models.billing_model import Bill, BillItem


def clean_appointments(db: Session):
    """
    Clean all appointment-related data from the database.
    
    Args:
        db: Database session
    """
    try:
        print("Starting appointment cleanup process...")
        
        # Step 1: Delete all bill items (FK to appointments)
        print("\n1. Deleting all bill items...")
        bill_item_count = db.query(BillItem).filter(BillItem.appointment_id.isnot(None)).delete()
        print(f"   Deleted {bill_item_count} bill items")
        
        # Step 2: Delete all prescriptions (FK to appointments)
        print("\n2. Deleting all prescriptions...")
        prescription_count = db.query(Prescription).filter(Prescription.appointment_id.isnot(None)).delete()
        print(f"   Deleted {prescription_count} prescriptions")
        
        # Step 3: Delete all claims (FK to appointments)
        print("\n3. Deleting all claims...")
        claim_count = db.query(Claim).delete()
        print(f"   Deleted {claim_count} claims")
        
        # Step 4: Delete all vitals (FK to appointments)
        print("\n4. Deleting all vitals...")
        vitals_count = db.query(Vitals).delete()
        print(f"   Deleted {vitals_count} vitals records")
        
        # Step 5: Delete all SOAP notes (FK to appointments)
        print("\n5. Deleting all SOAP notes...")
        soap_count = db.query(SoapNote).delete()
        print(f"   Deleted {soap_count} SOAP notes")
        
        # Step 6: Delete all appointment ICD code associations
        print("\n6. Deleting appointment ICD code associations...")
        icd_count = db.query(AppointmentICDCode).delete()
        print(f"   Deleted {icd_count} appointment ICD code associations")
        
        # Step 7: Delete all appointments
        print("\n7. Deleting all appointments...")
        appointment_count = db.query(Appointment).delete()
        print(f"   Deleted {appointment_count} appointments")
        
        # Step 8: Delete all appointment requests
        print("\n8. Deleting all appointment requests...")
        request_count = db.query(AppointmentRequest).delete()
        print(f"   Deleted {request_count} appointment requests")
        
        # Step 9: Reset all appointment slots to 'Available'
        print("\n9. Resetting appointment slots to 'Available'...")
        slots = db.query(AppointmentSession).filter(AppointmentSession.status != 'Available').all()
        session_count = 0
        for slot in slots:
            slot.status = 'Available'
            session_count += 1
        print(f"   Reset {session_count} appointment slots to 'Available'")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*60)
        print("✓ Appointment cleanup completed successfully!")
        print("="*60)
        print(f"\nSummary:")
        print(f"  - Bill items deleted: {bill_item_count}")
        print(f"  - Prescriptions deleted: {prescription_count}")
        print(f"  - Claims deleted: {claim_count}")
        print(f"  - Vitals deleted: {vitals_count}")
        print(f"  - SOAP notes deleted: {soap_count}")
        print(f"  - Appointment ICD codes deleted: {icd_count}")
        print(f"  - Appointments deleted: {appointment_count}")
        print(f"  - Appointment requests deleted: {request_count}")
        print(f"  - Appointment slots reset: {session_count}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error during cleanup: {str(e)}")
        print("All changes have been rolled back.")
        raise


def main():
    """Main function to execute the cleanup."""
    print("="*60)
    print("APPOINTMENT DATABASE CLEANUP SCRIPT")
    print("="*60)
    print("\nWARNING: This will delete ALL appointment-related data!")
    print("This includes:")
    print("  - All bill items")
    print("  - All prescriptions")
    print("  - All claims")
    print("  - All vitals")
    print("  - All SOAP notes")
    print("  - All appointment ICD code associations")
    print("  - All appointments")
    print("  - All appointment requests")
    print("  - Reset all appointment slots to 'Available'")
    print("\nThis operation CANNOT be undone!")
    print("="*60)
    
    # Ask for confirmation
    confirmation = input("\nType 'DELETE ALL APPOINTMENTS' to proceed: ")
    
    if confirmation != "DELETE ALL APPOINTMENTS":
        print("\nCleanup cancelled. No changes were made.")
        return
    
    # Create database session
    db = SessionLocal()
    
    try:
        clean_appointments(db)
    except Exception as e:
        print(f"\nFatal error: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
