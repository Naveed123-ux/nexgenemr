from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import json
import os
import requests # For AI API calls
import math


from models.lab_request_model import LabRequest, LabRequestStatus, LabRequestType
from models.brain_tumor_result_model import BrainTumorResult
from models.user_model import User
from utils.cloudinary_utils import upload_image

# --- Pydantic Schemas ---

class BrainTumorResultResponse(BaseModel):
    id: int
    request_id: int
    image_url: str
    result_class: str
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True

class LabRequestResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    lab_tech_id: Optional[int] = None
    appointment_id: Optional[int] = None
    request_type: LabRequestType
    status: LabRequestStatus
    priority: str
    notes: Optional[str] = None
    doctor_comment: Optional[str] = None
    doctor_rating: Optional[int] = None
    price: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    appointment_time: Optional[datetime] = None
    brain_tumor_result: Optional[BrainTumorResultResponse] = None


    class Config:
        from_attributes = True

class PaginatedLabRequestResponse(BaseModel):
    total: int
    page: int
    size: int
    totalPages: int
    items: List[LabRequestResponse]


class LabRequestCreate(BaseModel):
    patient_id: int
    request_type: LabRequestType
    appointment_id: Optional[int] = None
    notes: Optional[str] = None
    priority: str = "NORMAL"
    price: Optional[float] = None

class LabReviewInput(BaseModel):
    comment: str
    rating: int
    approved: bool

# --- AI Model API Configuration ---
AI_API_URL = os.getenv("AI_API_URL", "http://localhost:8000/braintumor/predict")

def create_lab_request(
    db: Session,
    doctor_id: int,
    data: LabRequestCreate
):
    # Check for duplicate non-rejected requests for this appointment and type
    if data.appointment_id:
        existing = db.query(LabRequest).filter(
            LabRequest.appointment_id == data.appointment_id,
            LabRequest.request_type == data.request_type,
            LabRequest.status != LabRequestStatus.REJECTED
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"An active {data.request_type} request already exists for this appointment (Status: {existing.status})"
            )

    new_request = LabRequest(

        patient_id=data.patient_id,
        doctor_id=doctor_id,
        appointment_id=data.appointment_id,
        request_type=data.request_type,
        status=LabRequestStatus.PENDING,
        notes=data.notes,
        priority=data.priority,
        price=data.price
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

def accept_lab_request(db: Session, request_id: int, lab_tech_id: int):
    request = db.query(LabRequest).filter(LabRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Lab request not found")
    
    if request.status != LabRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot accept request in status {request.status}")
    
    request.lab_tech_id = lab_tech_id
    request.status = LabRequestStatus.ACCEPTED
    db.commit()
    db.refresh(request)
    return request

def reject_lab_request(db: Session, request_id: int, lab_tech_id: int):
    request = db.query(LabRequest).filter(LabRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Lab request not found")
    
    if request.status != LabRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot reject request in status {request.status}")
    
    request.lab_tech_id = lab_tech_id
    request.status = LabRequestStatus.REJECTED
    db.commit()
    db.refresh(request)
    return request

def process_brain_tumor_request(db: Session, request_id: int, image_file: UploadFile):
    request = db.query(LabRequest).filter(LabRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Lab request not found")
    
    if request.status in [LabRequestStatus.COMPLETED, LabRequestStatus.APPROVED, LabRequestStatus.REJECTED]:
        raise HTTPException(status_code=400, detail=f"Cannot process request in status {request.status}")
    
    if request.status != LabRequestStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Request must be ACCEPTED before processing")
    
    # 1. Upload image to Cloudinary (for storage and doctor viewing)
    image_url = upload_image(file=image_file)
    
    # 2. Call AI API for Live Prediction
    try:
        # Rewind file pointer to ensure AI gets the full content if upload_image didn't
        image_file.file.seek(0)
        
        # Call the brain tumor model endpoint
        response = requests.post(AI_API_URL, files={
            "file": (image_file.filename, image_file.file, image_file.content_type)
        }, timeout=30)
        
        response.raise_for_status()
        ai_data = response.json()
        
        print(f"🤖 AI Response: {ai_data}")
        
        # Mapping AI response: "Brain Tumor" -> "YES", others -> "NO"
        prediction = ai_data.get("prediction", "").strip()
        result_class = "YES" if prediction == "Brain Tumor" else "NO"
        confidence = float(ai_data.get("confidence", 0.0))
        
    except Exception as e:
        print(f"❌ AI Integration Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing failed: {str(e)}")
    
    # 3. Save clinical result
    tumor_result = BrainTumorResult(
        request_id=request.id,
        image_url=image_url,
        result_class=result_class,
        confidence=confidence,
        raw_ai_response=json.dumps(ai_data)
    )
    db.add(tumor_result)
    
    # 4. Update request status
    request.status = LabRequestStatus.COMPLETED
    db.commit()
    db.refresh(request)
    
    return request

def review_lab_request(
    db: Session, 
    request_id: int, 
    doctor_id: int, 
    data: LabReviewInput
):
    request = db.query(LabRequest).filter(LabRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Lab request not found")
    
    if request.doctor_id != doctor_id:
        raise HTTPException(status_code=403, detail="Only the requesting doctor can review this result")
    
    if request.status != LabRequestStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Request is not yet completed")
    
    request.doctor_comment = data.comment
    request.doctor_rating = data.rating
    request.status = LabRequestStatus.APPROVED if data.approved else LabRequestStatus.REJECTED
    
    db.commit()
    db.refresh(request)
    return request

def get_lab_requests(
    db: Session, 
    status: Optional[LabRequestStatus] = None, 
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    page: int = 1,
    size: int = 10,
    current_user: Optional[User] = None
):
    from sqlalchemy import func
    from sqlalchemy.orm import joinedload
    from models.appointment_slot_model import AppointmentSlot
    from models.patient_profile_model import PatientProfile
    from models.appointment_model import Appointment
    from models.doctor_profile_model import DoctorProfile

    query = db.query(LabRequest).options(
        joinedload(LabRequest.patient),
        joinedload(LabRequest.appointment).joinedload(Appointment.slot),
        joinedload(LabRequest.brain_tumor_result)
    )

    # Hospital Scoping
    if current_user:
        hospital_id = None
        if current_user.role.name == "Hospital_Admin":
            hospital_id = current_user.hospital.id
        elif current_user.role.name == "Doctor":
            if current_user.doctor_profile and current_user.doctor_profile.department:
                hospital_id = current_user.doctor_profile.department.hospital_id
        elif current_user.role.name == "Lab_Technician":
            if current_user.staff_profile:
                hospital_id = current_user.staff_profile.hospital_id
        
        if hospital_id:
            # Join through PatientProfile to filter by hospital
            query = query.join(User, LabRequest.patient_id == User.id)\
                         .join(PatientProfile, User.id == PatientProfile.user_id)\
                         .filter(PatientProfile.hospital_id == hospital_id)
    
    if status:
        query = query.filter(LabRequest.status == status)
    
    if role == "Doctor":
        query = query.filter(LabRequest.doctor_id == user_id)
    elif role == "Patient":
        query = query.filter(LabRequest.patient_id == user_id)
    elif role == "Lab_Technician":
        # Lab Techs see all requests for their hospital (filtered above)
        # But if they are looking for "their" tasks (ACCEPTED/COMPLETED), filter by lab_tech_id
        if status and status not in [LabRequestStatus.PENDING]:
             query = query.filter(LabRequest.lab_tech_id == user_id)
            
    # Calculate totals for pagination
    total = query.count()
    total_pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size
    
    items = query.order_by(LabRequest.created_at.desc()).offset(offset).limit(size).all()
    
    # Populate extra fields for response
    for item in items:
        if item.patient:
            item.patient_name = f"{item.patient.first_name} {item.patient.last_name}"
        if item.appointment and item.appointment.slot:
            item.appointment_time = item.appointment.slot.start_time

    return PaginatedLabRequestResponse(
        total=total,
        page=page,
        size=size,
        totalPages=total_pages,
        items=items
    )


def get_lab_request_by_id(db: Session, request_id: int):
    from sqlalchemy.orm import joinedload
    from models.appointment_model import Appointment
    
    query = db.query(LabRequest).options(
        joinedload(LabRequest.patient),
        joinedload(LabRequest.appointment).joinedload(Appointment.slot),
        joinedload(LabRequest.brain_tumor_result)
    ).filter(LabRequest.id == request_id)
    
    item = query.first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Lab request not found")
        
    if item.patient:
        item.patient_name = f"{item.patient.first_name} {item.patient.last_name}"
    if item.appointment and item.appointment.slot:
        item.appointment_time = item.appointment.slot.start_time
        
    return item

