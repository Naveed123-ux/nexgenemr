from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.db import get_db
from services import availability_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User

router = APIRouter(prefix="/availability", tags=["Doctor Availability"])

@router.post("/template", response_model=availability_service.AvailabilityTemplateResponse, dependencies=[Depends(require_permission("availability:update"))])
def set_doctor_availability(
    template_data: availability_service.AvailabilityTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return availability_service.set_availability_template(db, template_data, current_user)

@router.get("/template", response_model=availability_service.AvailabilityTemplateResponse, dependencies=[Depends(require_permission("availability:read"))])
def get_doctor_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return availability_service.get_availability_template(current_user, db)
