import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from db.db import SessionLocal
from models.user_model import User
from models.patient_profile_model import PatientProfile
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.appointment_model import Appointment
from models.soap_note_model import SoapNote
from models.lab_request_model import LabRequest
from models.prescription_model import Prescription
from models.clinical_data_model import Vitals, MedicalHistory
from models.billing_model import PatientBilling
from models.claim_model import Claim
from models.signature_model import UserSignature
from models.google_auth_token_model import GoogleAuthToken
from models.messaging_model import Message
from models.waitlist_entry_model import WaitlistEntry
from models.discharge_summary_model import DischargeSummary
from models.handoff_note_model import HandoffNote
from models.appointment_slot_model import AppointmentSlot
from models.appointment_session_model import AppointmentSession
from models.brain_tumor_result_model import BrainTumorResult

def check_user_data(email):
    db = SessionLocal()
    try:
        # Find user by email (manual check due to encryption)
        print(f"Searching for user with email: {email}")
        all_users = db.query(User).all()
        target_user = None
        for user in all_users:
            if user.email == email:
                target_user = user
                break
        
        if not target_user:
            print("User not found.")
            return

        user_id = target_user.id
        role = target_user.role.name if target_user.role else "N/A"
        print(f"User Found: ID={user_id}, Name={target_user.first_name} {target_user.last_name}, Role={role}")

        # Check Profiles
        patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        staff_profile = db.query(StaffProfile).filter(StaffProfile.user_id == user_id).first()

        data_summary = {
            "User": 1,
            "PatientProfile": 1 if patient_profile else 0,
            "DoctorProfile": 1 if doctor_profile else 0,
            "StaffProfile": 1 if staff_profile else 0,
            "UserSignature": db.query(UserSignature).filter(UserSignature.user_id == user_id).count(),
            "GoogleAuthToken": db.query(GoogleAuthToken).filter(GoogleAuthToken.user_id == user_id).count(),
            "SentMessages": db.query(Message).filter(Message.sender_id == user_id).count(),
            "ReceivedMessages": db.query(Message).filter(Message.receiver_id == user_id).count(),
        }

        # Appointments and related data
        if doctor_profile:
            appts = db.query(Appointment).filter(Appointment.doctor_user_id == user_id).all()
            data_summary["Appointments (as Doctor)"] = len(appts)
            data_summary["AvailabilitySlots"] = db.query(AppointmentSlot).filter(AppointmentSlot.doctor_user_id == user_id).count()
            data_summary["AppointmentSessions"] = db.query(AppointmentSession).filter(AppointmentSession.doctor_id == user_id).count()
        elif patient_profile:
            appts = db.query(Appointment).filter(Appointment.patient_profile_id == patient_profile.id).all()
            data_summary["Appointments (as Patient)"] = len(appts)
            data_summary["MedicalHistory"] = db.query(MedicalHistory).filter(MedicalHistory.patient_profile_id == patient_profile.id).count()
            data_summary["WaitlistEntries"] = db.query(WaitlistEntry).filter(WaitlistEntry.patient_id == user_id).count()
            data_summary["HandoffNotes"] = db.query(HandoffNote).filter(HandoffNote.patient_profile_id == patient_profile.id).count()
            
            # Lab requests can be associated via patient_id in LabRequest
            data_summary["LabRequests (as Patient)"] = db.query(LabRequest).filter(LabRequest.patient_id == user_id).count()
        else:
            appts = []

        appt_ids = [a.id for a in appts]
        if appt_ids:
            data_summary["SOAPNotes"] = db.query(SoapNote).filter(SoapNote.appointment_id.in_(appt_ids)).count()
            data_summary["LabRequests (via Apps)"] = db.query(LabRequest).filter(LabRequest.appointment_id.in_(appt_ids)).count()
            
            lab_req_ids = [lr.id for lr in db.query(LabRequest).filter(LabRequest.appointment_id.in_(appt_ids)).all()]
            if lab_req_ids:
                 data_summary["BrainTumorResults"] = db.query(BrainTumorResult).filter(BrainTumorResult.lab_request_id.in_(lab_req_ids)).count()

            data_summary["Prescriptions"] = db.query(Prescription).filter(Prescription.appointment_id.in_(appt_ids)).count()
            data_summary["BillingRecords"] = db.query(PatientBilling).filter(PatientBilling.appointment_id.in_(appt_ids)).count()
            data_summary["Claims"] = db.query(Claim).filter(Claim.appointment_id.in_(appt_ids)).count()
            data_summary["DischargeSummaries"] = db.query(DischargeSummary).filter(DischargeSummary.appointment_id.in_(appt_ids)).count()
            data_summary["Vitals"] = db.query(Vitals).filter(Vitals.appointment_id.in_(appt_ids)).count()

        print("\nData Summary:")
        for key, count in data_summary.items():
            if count > 0:
                print(f"- {key}: {count}")

    finally:
        db.close()

if __name__ == "__main__":
    check_user_data("aleshaimran21@gmail.com")
