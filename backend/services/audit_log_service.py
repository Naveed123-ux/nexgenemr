import json
from fastapi import HTTPException
from models.user_model import User

AUDIT_LOG_FILE = "audit_log.json"

def get_audit_logs(current_user: User):
    """
    Reads and returns the contents of the audit log file, filtered by the
    hospital of the current user.
    """
    hospital_id = None
    if current_user.role.name == "Hospital_Admin" and current_user.hospital:
        hospital_id = current_user.hospital.id
    elif current_user.role.name == "Doctor" and current_user.doctor_profile and current_user.doctor_profile.department:
        hospital_id = current_user.doctor_profile.department.hospital_id
    elif current_user.role.name == "Receptionist" and current_user.staff_profile:
        hospital_id = current_user.staff_profile.hospital_id

    if not hospital_id:
        return []

    try:
        with open(AUDIT_LOG_FILE, "r") as f:
            logs = [json.loads(line) for line in f if json.loads(line).get("hospital_id") == hospital_id]
        return logs
    except FileNotFoundError:
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading audit log: {e}")