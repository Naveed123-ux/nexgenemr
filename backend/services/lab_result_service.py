from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from models.lab_result_model import LabResult
from models.user_model import User
from models.patient_profile_model import PatientProfile

# Pydantic Schemas
class LabResultBase(BaseModel):
    hemoglobin: Optional[float] = None
    wbc: Optional[float] = None
    glucose: Optional[float] = None
    creatinine: Optional[float] = None
    alt: Optional[float] = None
    total_cholesterol: Optional[float] = None

class LabResultCreate(LabResultBase):
    result_date: date

class LabResultUpdate(LabResultBase):
    pass

class LabResultResponse(LabResultBase):
    id: int
    patient_user_id: int
    result_date: date

    class Config:
        from_attributes = True

# Service Functions
def create_lab_result(patient_user_id: int, lab_data: LabResultCreate, db: Session):
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail=f"Patient with user ID {patient_user_id} not found.")

    new_lab_result = LabResult(
        patient_user_id=patient_user_id,
        **lab_data.dict()
    )
    db.add(new_lab_result)
    db.commit()
    db.refresh(new_lab_result)
    return new_lab_result

def get_lab_result_by_id(lab_result_id: int, db: Session):
    lab_result = db.query(LabResult).filter(LabResult.id == lab_result_id).first()
    if not lab_result:
        raise HTTPException(status_code=404, detail="Lab result not found.")
    return lab_result

def get_all_lab_results_for_patient(patient_user_id: int, db: Session):
    lab_results = db.query(LabResult).filter(LabResult.patient_user_id == patient_user_id).order_by(LabResult.result_date.desc()).all()
    return lab_results

def update_lab_result(lab_result_id: int, lab_data: LabResultUpdate, db: Session):
    db_lab_result = get_lab_result_by_id(lab_result_id, db)
    
    update_data = lab_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lab_result, key, value)
        
    db.commit()
    db.refresh(db_lab_result)
    return db_lab_result

def delete_lab_result(lab_result_id: int, db: Session):
    db_lab_result = get_lab_result_by_id(lab_result_id, db)
    db.delete(db_lab_result)
    db.commit()
    return {"detail": "Lab result deleted successfully."}