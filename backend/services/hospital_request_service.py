from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List

from models.hospital_request_model import HospitalRequest
from services.hospital_service import create_hospital_and_admin, HospitalCreate

# Pydantic Schemas
class HospitalRequestCreate(BaseModel):
    first_name: str
    last_name: str
    code: str
    email: EmailStr
    phone_number: str
    country: str

class HospitalRequestResponse(BaseModel):
    id: int
    name: str
    code: str
    email: EmailStr
    phone_number: str
    country: str
    status: str

    class Config:
        from_attributes = True

class HospitalRequestUpdate(BaseModel):
    status: str # "accepted" or "rejected"

# Service Functions
def create_hospital_request(request_data: HospitalRequestCreate, db: Session):
    existing_request = db.query(HospitalRequest).filter(
        (HospitalRequest.email == request_data.email) | (HospitalRequest.code == request_data.code)
    ).first()
    if existing_request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A hospital request with this email or code already exists.")

    full_name = f"{request_data.first_name} {request_data.last_name}"

    new_request = HospitalRequest(
        name=full_name,
        code=request_data.code,
        email=request_data.email,
        phone_number=request_data.phone_number,
        country=request_data.country,
        status='pending'
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

def get_all_hospital_requests(db: Session) -> List[HospitalRequestResponse]:
    requests = db.query(HospitalRequest).all()
    return requests

def update_hospital_request_status(request_id: int, status_update: HospitalRequestUpdate, db: Session):
    request = db.query(HospitalRequest).filter(HospitalRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital request not found.")

    new_status = status_update.status.lower()
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status. Must be 'accepted' or 'rejected'.")

    if request.status != 'pending':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"This request has already been processed with status: {request.status}.")

    request.status = new_status
    db.commit()

    if new_status == 'accepted':
        name_parts = request.name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        hospital_data = HospitalCreate(
            name=request.name, # Use the requester's full name as the initial hospital name
            code=request.code,
            email=request.email,
            phone_number=request.phone_number,
            country=request.country,
            admin_first_name=first_name,
            admin_last_name=last_name,
        )
        
        created_hospital = create_hospital_and_admin(
            db=db,
            hospital_data=hospital_data
        )
        db.refresh(request)
        return {"request": request, "created_hospital": created_hospital}
    
    db.refresh(request)
    return {"request": request}

def delete_hospital_request(request_id: int, db: Session):
    request = db.query(HospitalRequest).filter(HospitalRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital request not found.")
    
    db.delete(request)
    db.commit()
    return {"detail": "Hospital request deleted successfully."}