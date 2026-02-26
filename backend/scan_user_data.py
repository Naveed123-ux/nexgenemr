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
from models.billing_model import Bill, BillItem
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
from models.patient_task_model import PatientTask
from models.patient_summary_model import PatientSummary

def scan_user_data(email):
    db = SessionLocal()
    try:
        print(f"Scanning data for email: {email}")
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
        print(f"Found User ID: {user_id}, Role: {role}")

        patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        staff_profile = db.query(StaffProfile).filter(StaffProfile.user_id == user_id).first()

        results = {}

        # 1. Direct User Links
        results["User"] = [user_id]
        results["UserSignature"] = [s.id for s in db.query(UserSignature).filter(UserSignature.user_id == user_id).all()]
        results["GoogleAuthToken"] = [t.id for t in db.query(GoogleAuthToken).filter(GoogleAuthToken.user_id == user_id).all()]
        results["SentMessages"] = [m.id for m in db.query(Message).filter(Message.sender_id == user_id).all()]
        results["ReceivedMessages"] = [m.id for m in db.query(Message).filter(Message.receiver_id == user_id).all()]
        results["PatientTasks (owned)"] = [t.id for t in db.query(PatientTask).filter(PatientTask.patient_user_id == user_id).all()]
        results["PatientTasks (created)"] = [t.id for t in db.query(PatientTask).filter(PatientTask.created_by_user_id == user_id).all()]
        results["PatientSummaries (as patient)"] = [s.id for s in db.query(PatientSummary).filter(PatientSummary.patient_user_id == user_id).all()]
        results["PatientSummaries (as doctor)"] = [s.id for s in db.query(PatientSummary).filter(PatientSummary.doctor_user_id == user_id).all()]
        results["Prescriptions (as patient)"] = [p.id for p in db.query(Prescription).filter(Prescription.patient_user_id == user_id).all()]
        results["WaitlistEntries"] = [w.id for w in db.query(WaitlistEntry).filter(WaitlistEntry.patient_id == user_id).all()]
        results["LabRequests (as patient)"] = [l.id for l in db.query(LabRequest).filter(LabRequest.patient_id == user_id).all()]
        results["LabRequests (as doctor)"] = [l.id for l in db.query(LabRequest).filter(LabRequest.doctor_id == user_id).all()]
        results["LabRequests (as tech)"] = [l.id for l in db.query(LabRequest).filter(LabRequest.lab_tech_id == user_id).all()]

        # 2. Profile Links
        if patient_profile:
             results["PatientProfile"] = [patient_profile.id]
             results["MedicalHistory"] = [m.id for m in db.query(MedicalHistory).filter(MedicalHistory.patient_profile_id == patient_profile.id).all()]
             results["HandoffNotes"] = [h.id for h in db.query(HandoffNote).filter(HandoffNote.patient_profile_id == patient_profile.id).all()]
             results["Bills (as patient)"] = [b.id for b in db.query(Bill).filter(Bill.patient_profile_id == patient_profile.id).all()]

        if doctor_profile:
             results["DoctorProfile"] = [doctor_profile.id]
             results["AvailabilitySlots"] = [s.id for s in db.query(AppointmentSlot).filter(AppointmentSlot.doctor_user_id == user_id).all()]
             results["AppointmentSessions"] = [s.id for s in db.query(AppointmentSession).filter(AppointmentSession.doctor_id == user_id).all()]

        if staff_profile:
             results["StaffProfile"] = [staff_profile.id]

        # 3. Appointment Links
        appts = []
        if doctor_profile:
            appts = db.query(Appointment).filter(Appointment.doctor_user_id == user_id).all()
        elif patient_profile:
            appts = db.query(Appointment).filter(Appointment.patient_profile_id == patient_profile.id).all()
        
        appt_ids = [a.id for a in appts]
        if appt_ids:
            results["Appointments"] = appt_ids
            results["SOAPNotes"] = [s.id for s in db.query(SoapNote).filter(SoapNote.appointment_id.in_(appt_ids)).all()]
            results["Vitals"] = [v.id for v in db.query(Vitals).filter(Vitals.appointment_id.in_(appt_ids)).all()]
            results["Claims"] = [c.id for c in db.query(Claim).filter(Claim.appointment_id.in_(appt_ids)).all()]
            results["DischargeSummaries"] = [d.id for d in db.query(DischargeSummary).filter(DischargeSummary.appointment_id.in_(appt_ids)).all()]
            results["BillItems"] = [bi.id for bi in db.query(BillItem).filter(BillItem.appointment_id.in_(appt_ids)).all()]
            results["Prescriptions (via appt)"] = [p.id for p in db.query(Prescription).filter(Prescription.appointment_id.in_(appt_ids)).all()]
            
            # Lab requests already covered by patient/doctor IDs, but checking for ones linked only via appt just in case
            extra_lab_reqs = [l.id for l in db.query(LabRequest).filter(LabRequest.appointment_id.in_(appt_ids)).all()]
            results["LabRequests (via appt)"] = list(set(extra_lab_reqs))

        # 4. Result Links (polymorphic)
        all_lab_req_ids = set()
        for k in ["LabRequests (as patient)", "LabRequests (as doctor)", "LabRequests (as tech)", "LabRequests (via appt)"]:
            if k in results:
                all_lab_req_ids.update(results[k])
        
        if all_lab_req_ids:
            results["BrainTumorResults"] = [r.id for r in db.query(BrainTumorResult).filter(BrainTumorResult.lab_request_id.in_(list(all_lab_req_ids))).all()]

        print("\nScan Results:")
        for key, ids in results.items():
            if ids:
                print(f"- {key}: {len(ids)} records (IDs: {ids if len(ids) < 10 else ids[:10] + ['...']})")

    finally:
        db.close()

if __name__ == "__main__":
    scan_user_data("aleshaimran21@gmail.com")
