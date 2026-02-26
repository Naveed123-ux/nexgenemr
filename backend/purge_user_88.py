import os
import traceback
from sqlalchemy import create_engine, text
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
EMR_ENCRYPTION_KEY = os.getenv("EMR_ENCRYPTION_KEY")
USER_ID = 88
EMAIL_TO_DELETE = "aleshaimran21@gmail.com"

f = Fernet(EMR_ENCRYPTION_KEY.encode())

def decrypt(value):
    try:
        return f.decrypt(value.encode()).decode()
    except:
        return value

def purge_data(dry_run=True):
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    
    # Start a transaction manually if not dry run
    trans = None
    if not dry_run:
        trans = conn.begin()
    
    print(f"{'DRY RUN' if dry_run else 'EXECUTION'}: Purging data for User ID {USER_ID} ({EMAIL_TO_DELETE})")
    
    try:
        # 1. Get dependent IDs
        patient_profile_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM patient_profiles WHERE user_id = {USER_ID}")).fetchall()]
        
        appt_where = f"doctor_user_id = {USER_ID}"
        if patient_profile_ids:
            appt_where += f" OR patient_profile_id IN ({','.join(map(str, patient_profile_ids))})"
        appt_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM appointments WHERE {appt_where}")).fetchall()]
        
        lab_req_ids = [r[0] for r in conn.execute(text(f"SELECT id FROM lab_requests WHERE patient_id = {USER_ID} OR doctor_id = {USER_ID} OR lab_tech_id = {USER_ID}")).fetchall()]
        
        waitlist_q = f"SELECT id FROM waitlist_entries WHERE doctor_user_id = {USER_ID}"
        if patient_profile_ids:
            waitlist_q += f" OR patient_profile_id IN ({','.join(map(str, patient_profile_ids))})"
        waitlist_ids = [r[0] for r in conn.execute(text(waitlist_q)).fetchall()]
        
        hr_ids = []
        hr_result = conn.execute(text("SELECT id, email FROM hospital_requests"))
        for hr_row in hr_result:
            if decrypt(hr_row[1]) == EMAIL_TO_DELETE:
                hr_ids.append(hr_row[0])
        
        print(f"IDs gathered: patient_profiles={patient_profile_ids}, appts={appt_ids}, lab_reqs={lab_req_ids}, waitlist={waitlist_ids}, hr={hr_ids}")

        # 2. Define deletion queries
        queries = [
            ("BrainTumorResult", "brain_tumor_results", f"DELETE FROM brain_tumor_results WHERE lab_request_id IN ({','.join(map(str, lab_req_ids)) if lab_req_ids else -1})"),
            ("LabResult", "lab_results", f"DELETE FROM lab_results WHERE patient_user_id = {USER_ID}"),
            ("SoapNote", "soap_notes", f"DELETE FROM soap_notes WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("Prescription", "prescriptions", f"DELETE FROM prescriptions WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1}) OR patient_user_id = {USER_ID}"),
            ("Vitals", "vitals", f"DELETE FROM vitals WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("Claim", "claims", f"DELETE FROM claims WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("DischargeSummary", "discharge_summaries", f"DELETE FROM discharge_summaries WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1}) OR patient_user_id = {USER_ID} OR created_by_doctor_id = {USER_ID} OR signed_by_doctor_id = {USER_ID} OR signed_by_staff_id = {USER_ID} OR signed_by_admin_id = {USER_ID}"),
            ("AppointmentICDCode", "appointment_icd_codes", f"DELETE FROM appointment_icd_codes WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1}) OR added_by_user_id = {USER_ID}"),
            ("BillItem", "bill_items", f"DELETE FROM bill_items WHERE appointment_id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("Bill", "bills", f"DELETE FROM bills WHERE patient_profile_id IN ({','.join(map(str, patient_profile_ids)) if patient_profile_ids else -1}) OR created_by = {USER_ID}"),
            ("HandoffNote", "handoff_notes", f"DELETE FROM handoff_notes WHERE patient_profile_id IN ({','.join(map(str, patient_profile_ids)) if patient_profile_ids else -1})"),
            ("MedicalHistory", "medical_history", f"DELETE FROM medical_history WHERE patient_profile_id IN ({','.join(map(str, patient_profile_ids)) if patient_profile_ids else -1})"),
            ("WaitlistBookingToken", "waitlist_booking_tokens", f"DELETE FROM waitlist_booking_tokens WHERE waitlist_entry_id IN ({','.join(map(str, waitlist_ids)) if waitlist_ids else -1})"),
            ("WaitlistEntry", "waitlist_entries", f"DELETE FROM waitlist_entries WHERE id IN ({','.join(map(str, waitlist_ids)) if waitlist_ids else -1})"),
            ("Appointment", "appointments", f"DELETE FROM appointments WHERE id IN ({','.join(map(str, appt_ids)) if appt_ids else -1})"),
            ("AppointmentSlot", "appointment_slots", f"DELETE FROM appointment_slots WHERE doctor_user_id = {USER_ID}"),
            ("AppointmentSession", "appointment_sessions", f"DELETE FROM appointment_sessions WHERE doctor_id = {USER_ID}"),
            ("PatientTask", "patient_tasks", f"DELETE FROM patient_tasks WHERE patient_user_id = {USER_ID} OR created_by_user_id = {USER_ID}"),
            ("PatientSummary", "patient_summaries", f"DELETE FROM patient_summaries WHERE patient_user_id = {USER_ID} OR doctor_user_id = {USER_ID} OR signed_by_doctor_id = {USER_ID} OR signed_by_staff_id = {USER_ID} OR signed_by_admin_id = {USER_ID}"),
            ("Message", "messages", f"DELETE FROM messages WHERE sender_id = {USER_ID} OR receiver_id = {USER_ID}"),
            ("UserSignature", "user_signatures", f"DELETE FROM user_signatures WHERE user_id = {USER_ID}"),
            ("GoogleAuthToken", "google_auth_tokens", f"DELETE FROM google_auth_tokens WHERE user_id = {USER_ID}"),
            ("DoctorProfile", "doctor_profiles", f"DELETE FROM doctor_profiles WHERE user_id = {USER_ID}"),
            ("PatientProfile", "patient_profiles", f"DELETE FROM patient_profiles WHERE user_id = {USER_ID}"),
            ("StaffProfile", "staff_profiles", f"DELETE FROM staff_profiles WHERE user_id = {USER_ID}"),
            ("LabRequest", "lab_requests", f"DELETE FROM lab_requests WHERE id IN ({','.join(map(str, lab_req_ids)) if lab_req_ids else -1})"),
            ("HospitalRequest", "hospital_requests", f"DELETE FROM hospital_requests WHERE id IN ({','.join(map(str, hr_ids)) if hr_ids else -1})"),
            ("User", "users", f"DELETE FROM users WHERE id = {USER_ID}")
        ]

        for label, table, sql in queries:
            try:
                where_clause = sql.split("WHERE")[1]
                count_sql = f"SELECT COUNT(*) FROM {table} WHERE {where_clause}"
                count = conn.execute(text(count_sql)).scalar()
                if count > 0:
                    print(f"- {label} ({table}): {count} records found.")
                    if not dry_run:
                        conn.execute(text(sql))
                        print(f"  Deleted.")
            except Exception as e:
                print(f"Error processing {label} ({table}): {str(e)}")

        if not dry_run and trans:
            trans.commit()
            print("Purge completed and committed successfully.")
            
    except Exception as e:
        print("Fatal error during purge:")
        traceback.print_exc()
        if trans:
            trans.rollback()
            print("Purge rolled back.")
    finally:
        conn.close()

if __name__ == "__main__":
    purge_data(dry_run=False)
