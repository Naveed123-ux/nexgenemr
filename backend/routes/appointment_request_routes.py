# routes/appointment_request_routes.py
from fastapi import APIRouter, Depends
from services.appointment_request_service import (
    create_appointment_request,
    get_pending_requests,
    accept_appointment_request,
    decline_appointment_request,
    AppointmentRequestCreate,
)
from sqlalchemy.orm import Session
from db.db import get_db
from typing import List

router = APIRouter()

@router.post("/appointment-requests/", summary="Create a new appointment request")
def create_request(request: AppointmentRequestCreate, db: Session = Depends(get_db)):
    return create_appointment_request(request, db)

@router.get("/appointment-requests/pending", summary="Get all pending appointment requests")
def get_requests(db: Session = Depends(get_db)):
    return get_pending_requests(db)

@router.post("/appointment-requests/{request_id}/accept", summary="Accept an appointment request")
def accept_request(request_id: int, db: Session = Depends(get_db)):
    return accept_appointment_request(request_id, db)

@router.post("/appointment-requests/{request_id}/decline", summary="Decline an appointment request")
def decline_request(request_id: int, db: Session = Depends(get_db)):
    return decline_appointment_request(request_id, db)