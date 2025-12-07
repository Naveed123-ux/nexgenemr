from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from utils.dependencies import get_current_user
from db.db import get_db
from utils.audit_logging import log_audit_event

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only log mutation methods
        if request.method in ["POST", "PUT", "DELETE"]:
            # Process the request to get the response
            response = await call_next(request)

            # Get user and hospital information
            try:
                auth_header = request.headers.get("authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.replace("Bearer ", "")
                    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
                    db_gen = get_db()
                    db = next(db_gen)
                    user = get_current_user(creds=creds, db=db)

                    hospital_id = None
                    if user:
                        if user.role.name == "Hospital_Admin" and user.hospital:
                            hospital_id = user.hospital.id
                        elif user.role.name == "Doctor" and user.doctor_profile and user.doctor_profile.department:
                            hospital_id = user.doctor_profile.department.hospital_id
                        elif user.role.name == "Receptionist" and user.staff_profile:
                            hospital_id = user.staff_profile.hospital_id

                        if hospital_id:
                            log_audit_event(request, user, hospital_id, response.status_code)

            except Exception as e:
                # Silently fail if user or hospital_id cannot be determined
                # to avoid breaking the request-response cycle.
                print(f"Audit log middleware error: {e}")
            finally:
                if 'db' in locals():
                    db.close()
            return response
        else:
            return await call_next(request)