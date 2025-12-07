import json
from datetime import datetime
from fastapi import Request
from models.user_model import User
from typing import Optional, Dict, Any

AUDIT_LOG_FILE = "audit_log.json"

def log_audit_event(request: Request, user: User, hospital_id: int, status_code: int):
    """
    Logs an audit event to a JSON file.
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user.id,
        "user_email": user.email,
        "user_role": user.role.name,
        "hospital_id": hospital_id,
        "http_method": request.method,
        "path": request.url.path,
        "status_code": status_code,
    }

    try:
        with open(AUDIT_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Error writing to audit log: {e}")


def log_waitlist_audit_event(
    action: str,
    user_id: Optional[int],
    entry_id: Optional[int] = None,
    patient_profile_id: Optional[int] = None,
    doctor_user_id: Optional[int] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    additional_data: Optional[Dict[str, Any]] = None
):
    """
    Logs a waitlist-specific audit event to a JSON file.
    
    Args:
        action: The action performed (e.g., "create_entry", "update_entry", "send_invitation", "claim_booking")
        user_id: ID of the user performing the action (None for system actions or public endpoints)
        entry_id: ID of the waitlist entry (if applicable)
        patient_profile_id: ID of the patient profile (if applicable)
        doctor_user_id: ID of the doctor user (if applicable)
        old_values: Dictionary of old values before update (for update operations)
        new_values: Dictionary of new values after update (for update operations)
        additional_data: Any additional context data
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "category": "waitlist",
        "action": action,
        "user_id": user_id,
        "entry_id": entry_id,
        "patient_profile_id": patient_profile_id,
        "doctor_user_id": doctor_user_id,
    }
    
    if old_values:
        log_entry["old_values"] = old_values
    
    if new_values:
        log_entry["new_values"] = new_values
    
    if additional_data:
        log_entry["additional_data"] = additional_data
    
    try:
        with open(AUDIT_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Error writing to waitlist audit log: {e}")