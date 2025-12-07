from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from models.appointment_model import Appointment
from models.appointment_icd_code_model import AppointmentICDCode
from models.icd_code_model import ICDCode
from models.user_model import User
from schemas.appointment_icd_schema import (
    AppointmentICDCodeResponse,
    ICDCodeResponse,
    AddICDCodeRequest,
    RemoveICDCodeRequest,
    UpdateAppointmentICDCodesRequest
)

def check_appointment_access(appointment: Appointment, current_user: User) -> bool:
    """
    Check if the current user has access to modify the appointment.
    Doctors can only modify their own appointments.
    Hospital staff can modify any appointment in their hospital.
    """
    user_role = current_user.role.name
    
    if user_role == "Doctor":
        return appointment.doctor_user_id == current_user.id
    elif user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        # Check if appointment belongs to the same hospital
        if user_role == "Hospital_Admin":
            hospital_id = current_user.hospital.id
        else:
            hospital_id = current_user.staff_profile.hospital_id
        return appointment.patient.hospital_id == hospital_id
    
    return False

def get_appointment_icd_codes(appointment_id: int, current_user: User, db: Session) -> List[AppointmentICDCodeResponse]:
    """
    Get all ICD codes for a specific appointment.
    """
    # Get appointment with relationships
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.appointment_icd_codes).joinedload(AppointmentICDCode.icd_code)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    
    # Check access
    if not check_appointment_access(appointment, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this appointment's ICD codes"
        )
    
    return [
        AppointmentICDCodeResponse(
            id=aicd.id,
            appointment_id=aicd.appointment_id,
            icd_code_id=aicd.icd_code_id,
            icd_code=ICDCodeResponse(
                id=aicd.icd_code.id,
                code=aicd.icd_code.code,
                description=aicd.icd_code.description
            ),
            added_at=aicd.added_at,
            added_by_user_id=aicd.added_by_user_id
        )
        for aicd in appointment.appointment_icd_codes
    ]

def add_icd_codes_to_appointment(
    appointment_id: int,
    request: AddICDCodeRequest,
    current_user: User,
    db: Session
) -> List[AppointmentICDCodeResponse]:
    """
    Add one or more ICD codes to an appointment.
    Duplicates are ignored.
    """
    # Get appointment
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.appointment_icd_codes)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    
    # Check access
    if not check_appointment_access(appointment, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this appointment's ICD codes"
        )
    
    # Get existing ICD code IDs
    existing_icd_ids = {aicd.icd_code_id for aicd in appointment.appointment_icd_codes}
    
    # Validate all ICD codes exist
    icd_codes = db.query(ICDCode).filter(ICDCode.id.in_(request.icd_code_ids)).all()
    if len(icd_codes) != len(request.icd_code_ids):
        found_ids = {icd.id for icd in icd_codes}
        missing_ids = set(request.icd_code_ids) - found_ids
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ICD codes not found: {missing_ids}"
        )
    
    # Add new ICD codes (skip duplicates)
    added_codes = []
    for icd_code_id in request.icd_code_ids:
        if icd_code_id not in existing_icd_ids:
            new_association = AppointmentICDCode(
                appointment_id=appointment_id,
                icd_code_id=icd_code_id,
                added_by_user_id=current_user.id,
                added_at=datetime.utcnow()
            )
            db.add(new_association)
            added_codes.append(icd_code_id)
    
    db.commit()
    
    # Return updated list
    return get_appointment_icd_codes(appointment_id, current_user, db)

def remove_icd_code_from_appointment(
    appointment_id: int,
    request: RemoveICDCodeRequest,
    current_user: User,
    db: Session
) -> List[AppointmentICDCodeResponse]:
    """
    Remove a specific ICD code from an appointment.
    """
    # Get appointment
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    
    # Check access
    if not check_appointment_access(appointment, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this appointment's ICD codes"
        )
    
    # Find and delete the association
    association = db.query(AppointmentICDCode).filter(
        AppointmentICDCode.appointment_id == appointment_id,
        AppointmentICDCode.icd_code_id == request.icd_code_id
    ).first()
    
    if not association:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ICD code {request.icd_code_id} not found in this appointment"
        )
    
    db.delete(association)
    db.commit()
    
    # Return updated list
    return get_appointment_icd_codes(appointment_id, current_user, db)

def update_appointment_icd_codes(
    appointment_id: int,
    request: UpdateAppointmentICDCodesRequest,
    current_user: User,
    db: Session
) -> List[AppointmentICDCodeResponse]:
    """
    Replace all ICD codes for an appointment with a new set.
    This removes all existing codes and adds the new ones.
    """
    # Get appointment
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.appointment_icd_codes)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    
    # Check access
    if not check_appointment_access(appointment, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this appointment's ICD codes"
        )
    
    # Validate all new ICD codes exist
    if request.icd_code_ids:
        icd_codes = db.query(ICDCode).filter(ICDCode.id.in_(request.icd_code_ids)).all()
        if len(icd_codes) != len(request.icd_code_ids):
            found_ids = {icd.id for icd in icd_codes}
            missing_ids = set(request.icd_code_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ICD codes not found: {missing_ids}"
            )
    
    # Remove all existing associations
    db.query(AppointmentICDCode).filter(
        AppointmentICDCode.appointment_id == appointment_id
    ).delete()
    
    # Add new associations
    for icd_code_id in request.icd_code_ids:
        new_association = AppointmentICDCode(
            appointment_id=appointment_id,
            icd_code_id=icd_code_id,
            added_by_user_id=current_user.id,
            added_at=datetime.utcnow()
        )
        db.add(new_association)
    
    db.commit()
    
    # Return updated list
    return get_appointment_icd_codes(appointment_id, current_user, db)
