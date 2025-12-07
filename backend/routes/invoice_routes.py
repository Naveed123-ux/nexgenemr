# backend/routes/invoice_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db.db import get_db
from models.user_model import User
from utils.dependencies import get_current_user
from services import invoice_service
from schemas.invoice_schema import (
    InvoiceResponse, InvoiceDetailResponse, InvoiceGenerateRequest
)

router = APIRouter()

# ==================== PATIENT ROUTES ====================

@router.get("/patient/my-invoices", response_model=List[InvoiceResponse], tags=["Invoices", "Patient"])
def get_my_invoices(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all invoices for the currently authenticated patient.
    
    **Access**: Patient only
    
    **Returns**: List of patient's invoices with:
    - Invoice number and status
    - Total, paid, and outstanding amounts
    - Due dates and payment information
    - Patient and hospital details
    
    **Pagination**: Use skip and limit parameters
    
    **Example Use Case**: Patient dashboard showing billing/invoice history
    """
    return invoice_service.get_patient_invoices(db, current_user, skip, limit)


@router.get("/patient/invoices/{invoice_id}", response_model=InvoiceDetailResponse, tags=["Invoices", "Patient"])
def get_my_invoice_details(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific invoice (patient-specific endpoint).
    
    **Access**: Patient only (for their own invoices)
    
    **Returns**: Complete invoice details including:
    - All line items with ICD codes and descriptions
    - Service dates and amounts
    - Payment history
    - Hospital information
    
    **Example Use Case**: Patient viewing detailed invoice breakdown before payment
    """
    return invoice_service.get_invoice_by_id(db, invoice_id, current_user)


@router.get("/patient/invoices/{invoice_id}/download", tags=["Invoices", "Patient"])
def download_my_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download invoice as a professional PDF document.
    
    **Access**: Patient only (for their own invoices)
    
    **Returns**: PDF file with professional invoice template including:
    - Hospital and patient information
    - Invoice number and dates
    - Itemized services with ICD codes
    - Payment status and amounts
    - Professional formatting with colors and styling
    
    **PDF Features**:
    - Industry-standard invoice layout
    - Color-coded status indicators
    - Detailed line items table
    - Payment summary section
    - Hospital branding
    
    **Example Use Case**: Patient downloading invoice for insurance reimbursement or records
    """
    return invoice_service.generate_invoice_pdf(db, invoice_id, current_user)


# ==================== HOSPITAL ADMIN ROUTES ====================

@router.get("/hospital/invoices", response_model=List[InvoiceResponse], tags=["Invoices", "Hospital Admin"])
def get_hospital_invoices(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all invoices for the hospital (admin only).
    
    **Access**: Hospital Admin, Receptionist, Staff
    
    **Returns**: List of all invoices in the hospital with:
    - Patient names and invoice numbers
    - Payment status and amounts
    - Due dates
    
    **Pagination**: Use skip and limit parameters
    
    **Example Use Case**: Hospital admin viewing all patient invoices
    """
    return invoice_service.get_hospital_invoices(db, current_user, skip, limit)


@router.get("/hospital/invoices/{invoice_id}", response_model=InvoiceDetailResponse, tags=["Invoices", "Hospital Admin"])
def get_hospital_invoice_details(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific invoice (hospital admin endpoint).
    
    **Access**: Hospital Admin, Receptionist, Staff (for invoices in their hospital)
    
    **Returns**: Complete invoice details including:
    - All line items with ICD codes
    - Service dates and amounts
    - Patient information
    - Payment history
    
    **Example Use Case**: Hospital staff reviewing invoice details
    """
    return invoice_service.get_invoice_by_id(db, invoice_id, current_user)


@router.get("/hospital/invoices/{invoice_id}/download", tags=["Invoices", "Hospital Admin"])
def download_hospital_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download invoice as a professional PDF document (hospital admin endpoint).
    
    **Access**: Hospital Admin, Receptionist, Staff (for invoices in their hospital)
    
    **Returns**: PDF file with professional invoice template
    
    **Example Use Case**: Hospital staff downloading invoice for patient or records
    """
    return invoice_service.generate_invoice_pdf(db, invoice_id, current_user)


@router.get("/appointment/{appointment_id}/invoice", response_model=InvoiceDetailResponse, tags=["Invoices", "Hospital Admin"])
def get_appointment_invoice(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get invoice for a specific appointment.
    
    **Access**: Hospital Admin, Receptionist, Staff, or Patient (if it's their appointment)
    
    **Returns**: Invoice details for the specified appointment
    
    **Example Use Case**: Hospital admin viewing invoice for a specific appointment
    """
    return invoice_service.get_appointment_invoice(db, appointment_id, current_user)


# ==================== COMMON ROUTES ====================

@router.get("/{invoice_id}", response_model=InvoiceDetailResponse, tags=["Invoices"])
def get_invoice_details(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific invoice.
    
    **Access**:
    - Hospital Admin/Staff: Can view invoices from their hospital
    - Patients: Can only view their own invoices
    
    **Returns**: Complete invoice details with line items, patient name, and hospital name
    """
    return invoice_service.get_invoice_by_id(db, invoice_id, current_user)


@router.get("/{invoice_id}/download", tags=["Invoices"])
def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download invoice as a professional PDF document.
    
    **Access**:
    - Hospital Admin/Staff: Can download invoices from their hospital
    - Patients: Can only download their own invoices
    
    **Returns**: PDF file with professional invoice template
    """
    return invoice_service.generate_invoice_pdf(db, invoice_id, current_user)
