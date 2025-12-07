# EMR-BACKEND/services/tracker_column_service.py

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import datetime, date, time
from typing import List, Dict, Any, Optional
from models.appointment_model import Appointment
from models.appointment_session_model import AppointmentSession
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.user_model import User
from services.hospital_service import get_my_hospital

from db.db import get_db
from models.role_model import Role
from models.tracker_column_model import TrackerColumn

class ColumnAccessRequest(BaseModel):
    # A list of TrackerColumn IDs to grant access to.
    column_ids: List[int]

class ColumnResponse(BaseModel):
    id: int
    column_key: str
    display_name: str

    class Config:
        from_attributes = True

def get_all_tracker_columns(db: Session) -> List[ColumnResponse]:
    """Returns the master list of all available tracker columns."""
    return db.query(TrackerColumn).all()

def get_columns_for_role(role_id: int, db: Session) -> List[ColumnResponse]:
    """
    Fetches the specific list of tracker columns that a given role has access to.
    """
    role = db.query(Role).options(
        joinedload(Role.tracker_columns)
    ).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")
    
    return role.tracker_columns

def update_role_column_access(role_id: int, request: ColumnAccessRequest, db: Session) -> List[ColumnResponse]:
    """
    Updates the column access for a role. This is an 'overwrite' operation.
    The provided list of column_ids becomes the new source of truth.
    - Grants access to columns in the list.
    - Revokes access from columns NOT in the list.
    - To revoke all access, pass an empty list.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    # Fetch the column objects that the admin wants to grant access to
    columns_to_assign = db.query(TrackerColumn).filter(TrackerColumn.id.in_(request.column_ids)).all()

    # Verify all requested column IDs were valid
    if len(columns_to_assign) != len(request.column_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more column IDs are invalid.")

    # Overwrite the existing list of columns with the new list
    role.tracker_columns = columns_to_assign
    
    db.commit()
    db.refresh(role)
    
    return get_columns_for_role(role_id, db)


def get_tracker_patient_data(current_user: User, db: Session) -> List[Dict[str, Any]]:
    """
    Fetches and formats patient data for the tracker board. It retrieves all patients
    for the user's hospital and filters the returned data fields based on the
    columns assigned to the user's role.
    """
    print(f"\n--- [Tracker Data Service] Attempting to fetch data for user: {current_user.email} ---")
    try:
        # 1. Determine the user's hospital
        print("1. Identifying user's hospital...")
        hospital = get_my_hospital(current_user, db)
        hospital_id = hospital.id
        print(f"   ✅ Found Hospital: '{hospital.name}' (ID: {hospital_id})")
    except Exception as e:
        # If user isn't associated with a hospital, return empty list
        print(f"   ❌ Could not determine hospital for this user. Error: {e}. Returning empty list.")
        return []

    # 2. Get the set of column keys the user's role is allowed to see.
    print(f"2. Fetching column permissions for role: '{current_user.role.name}'...")
    allowed_columns = current_user.role.tracker_columns
    allowed_column_keys = {col.column_key for col in allowed_columns}
    print(f"   ✅ Role has access to {len(allowed_column_keys)} columns: {allowed_column_keys}")

    # 3. Query all patient profiles for the hospital, sorted by newest first.
    print("3. Querying for all patient profiles in the hospital, sorted by registration date...")
    all_patients_in_hospital = db.query(PatientProfile).options(
        joinedload(PatientProfile.user),
        joinedload(PatientProfile.assigned_doctor) # Eager load the assigned doctor on the profile
    ).join(PatientProfile.user).filter(
        PatientProfile.hospital_id == hospital_id
    ).order_by(
        User.created_at.desc()
    ).all()
    
    print(f"4. Found {len(all_patients_in_hospital)} total patient profiles in this hospital.")

    # 5. Format the data for the frontend
    tracker_data = []
    for profile in all_patients_in_hospital:
        patient_name = "N/A"
        if profile.user:
            patient_name = f"{profile.user.first_name} {profile.user.last_name}"
        
        print(f"\n   Processing patient: '{patient_name}' (Profile ID: {profile.id})")

        # For each patient, find their most recent appointment to get visit-specific details.
        latest_appointment = db.query(Appointment).join(
            Appointment.slot
        ).options(
            joinedload(Appointment.doctor) # Eager load the doctor from the appointment
        ).filter(
            Appointment.patient_profile_id == profile.id
        ).order_by(
            AppointmentSession.start_time.desc()
        ).first()

        chief_complaint = "N/A"
        los_str = "N/A"
        doctor_name = "N/A"
        
        if latest_appointment:
            print(f"     -> Found latest appointment (ID: {latest_appointment.id}).")
            chief_complaint = latest_appointment.reason_for_visit
            
            # Prioritize the doctor from the specific appointment
            if latest_appointment.doctor:
                doctor_name = f"Dr. {latest_appointment.doctor.first_name} {latest_appointment.doctor.last_name}"
                print(f"     -> Doctor from appointment: '{doctor_name}' (User ID: {latest_appointment.doctor.id})")
            
            los_delta = datetime.utcnow() - latest_appointment.session.start_time
            hours, remainder = divmod(los_delta.total_seconds(), 3600)
            minutes, _ = divmod(remainder, 60)
            los_str = f"{int(hours)}h {int(minutes)}m"
        
        # If no doctor was found on the appointment, fall back to the one on the profile
        if doctor_name == "N/A" and profile.assigned_doctor:
            print(f"     -> No appointment doctor. Falling back to profile's assigned doctor.")
            doctor_name = f"Dr. {profile.assigned_doctor.first_name} {profile.assigned_doctor.last_name}"
            print(f"     -> Doctor from profile: '{doctor_name}' (User ID: {profile.assigned_doctor.id})")
        elif doctor_name == "N/A":
            print(f"     -> No doctor found on appointment OR on patient profile.")


        # Create a complete data row with all possible fields
        full_data_row = {
            "patient_name": patient_name,
            "assigned_md": doctor_name,
            "visit_status": "Active" if profile.status else "Inactive",
            "chief_complaint": chief_complaint,
            "length_of_stay": los_str,
            "bay_or_room": None,
            "room_status": None,
            "triage_level": None,
            "assigned_resident_pa": None,
            "assigned_rn": None,
            "lab_status": None,
            "radiology_status": None,
            "medication_status": None,
            "disposition": None,
            "notes": None,
        }
        
        # Filter the row to only include keys the user is allowed to see
        filtered_row = {
            key: value for key, value in full_data_row.items() if key in allowed_column_keys
        }
        tracker_data.append(filtered_row)
    
    print(f"5. Formatting and returning {len(tracker_data)} filtered data rows. --- END --- \n")
    return tracker_data

