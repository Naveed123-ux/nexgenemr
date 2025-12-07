from fastapi import APIRouter, Depends
from services import audit_log_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter()

@router.get("/")
def get_audit_logs(current_user: User = Depends(get_current_user)):
    return audit_log_service.get_audit_logs(current_user)