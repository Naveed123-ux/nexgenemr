import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.getcwd())
load_dotenv()

from db.db import Base
# Base.metadata.schema = None # Keep schema for Postgres

import importlib
import pkgutil
import models

# Dynamically import all modules in models package to register them with Base
for loader, module_name, is_pkg in pkgutil.walk_packages(models.__path__, models.__name__ + "."):
    importlib.import_module(module_name)

from models.user_model import User
from models.role_model import Role
from models.hospital_model import Hospital
from models.patient_profile_model import PatientProfile
from models.lab_request_model import LabRequest, LabRequestStatus, LabRequestType
from models.billing_model import Bill, BillItem
from services.billing_service import generate_bill_for_patient
from schemas.billing_schema import BillCreate

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./nexgenemr.db" # Fallback

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_lab_billing():
    db = SessionLocal()
    try:
        print("Starting Lab Billing Verification...")

        # 1. Find or Create a Test Patient
        patient_profile = db.query(PatientProfile).filter(PatientProfile.billing_type == "Self-Pay").first()
        
        if not patient_profile:
             print("No Self-Pay patient found. Creating a dummy one...")
             # Need a hospital
             hospital = db.query(Hospital).first()
             if not hospital:
                 print("No hospital found. Please create one.")
                 return
             
             # Need a role for Patient
             patient_role = db.query(Role).first()
             if not patient_role:
                 print("No Roles found.")
                 return

             dummy_user = User(
                 email=f"test_patient_{datetime.now().strftime('%H%M%S')}@example.com",
                 hashed_password="hashed_password",
                 first_name="Test",
                 last_name="Patient",
                 role_id=patient_role.id
             )
             db.add(dummy_user)
             db.flush() # Get ID

             patient_profile = PatientProfile(
                 user_id=dummy_user.id,
                 hospital_id=hospital.id,
                 billing_type="Self-Pay",
                 status=True
             )
             db.add(patient_profile)
             db.commit()
             db.refresh(patient_profile)
             patient_user = dummy_user
             print(f"Created Dummy Patient: {patient_user.first_name} (ID: {patient_user.id})")
        else:
            patient_user = db.query(User).filter(User.id == patient_profile.user_id).first()
            print(f"Using Existing Patient: {patient_user.first_name} {patient_user.last_name} (ID: {patient_user.id})")


        # 2. Create a Dummy Doctor (if needed) or finding one
        doctor = db.query(User).join(Role).filter(Role.name == "Doctor").first()
        if not doctor:
            print("No Doctor found.")
            return
        
        # 3. Create a Lab Request with Price
        print("Creating Test Lab Request...")
        lab_request = LabRequest(
            patient_id=patient_user.id,
            doctor_id=doctor.id,
            request_type=LabRequestType.OTHER,
            status=LabRequestStatus.COMPLETED,
            priority="NORMAL",
            notes="Test Lab Request for Billing Verification",
            price=250.00  # Set a specific price
        )
        db.add(lab_request)
        db.commit()
        db.refresh(lab_request)
        print(f"Created Lab Request ID: {lab_request.id} with Price: {lab_request.price}")

        # 4. Create a Dummy Admin User for the context
        admin_user = db.query(User).join(Role).filter(Role.name == "Hospital_Admin").first()
        # Mock hospital for admin if needed
        # We assume admin exists

        # 5. Generate Bill
        print("Generating Bill...")
        bill_data = BillCreate(
            patient_user_id=patient_user.id,
            notes="Test Bill for Lab"
        )
        
        # We need to mock the current_user dependency or pass the admin user
        # The service expects a User object with role and hospital
        
        # Note: generate_bill_for_patient might check for unbilled appointments.
        # We modified it to allow just lab requests. 
        # But we need to make sure there are no other unbilled items that might confuse us, 
        # or we just verify that OUR item is there.
        
        try:
            bill_response = generate_bill_for_patient(db, bill_data, admin_user)
            print(f"Bill Generated: {bill_response.bill_number} (ID: {bill_response.id})")
            
            # 6. Verify Bill Items
            found_lab_item = False
            for item in bill_response.bill_items:
                if item.lab_request_id == lab_request.id:
                    found_lab_item = True
                    print(f"Found Bill Item for Lab Request ID {item.lab_request_id}")
                    print(f"  Description: {item.description}")
                    print(f"  Amount: {item.amount}")
                    
                    if abs(item.amount - 250.00) < 0.01:
                        print("✅ SUCCESS: Price matches!")
                    else:
                        print(f"❌ FAILURE: Price mismatch! Expected 250.00, got {item.amount}")
                    break
            
            if not found_lab_item:
                print("❌ FAILURE: Lab Request item not found in bill!")

            # Cleanup Bill
            # db.query(Bill).filter(Bill.id == bill_response.id).delete()
            # print("Cleaned up Test Bill.")

        except Exception as e:
            print(f"❌ Error during billing generation: {e}")

        # Cleanup Lab Request
        # db.delete(lab_request)
        # db.commit()
        # print("Cleaned up Test Lab Request.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_lab_billing()
