# backend/services/invoice_service.py
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from models.billing_model import Bill, BillItem, BillingStatus
from models.appointment_model import Appointment
from models.patient_profile_model import PatientProfile
from models.hospital_model import Hospital
from models.user_model import User
from schemas.invoice_schema import (
    InvoiceResponse, InvoiceDetailResponse, InvoiceItemResponse,
    InvoiceGenerateRequest
)
from datetime import datetime
from io import BytesIO
import logging

# ReportLab imports for PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

logger = logging.getLogger(__name__)


def get_patient_invoices(db: Session, current_user: User, skip: int = 0, limit: int = 100) -> list[InvoiceResponse]:
    """
    Get all invoices for a patient
    
    Args:
        db: Database session
        current_user: Current authenticated patient user
        skip: Pagination offset
        limit: Pagination limit
    
    Returns:
        list[InvoiceResponse]: List of patient invoices
    """
    # Verify user is a patient
    if current_user.role.name != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can access this endpoint")
    
    if not current_user.patient_profile:
        raise HTTPException(status_code=403, detail="Patient profile not found")
    
    # Get all bills for the patient
    bills = db.query(Bill).options(
        joinedload(Bill.patient).joinedload(PatientProfile.user),
        joinedload(Bill.hospital)
    ).filter(
        Bill.patient_profile_id == current_user.patient_profile.id
    ).offset(skip).limit(limit).all()
    
    return [_build_invoice_response(db, bill) for bill in bills]


def get_invoice_by_id(db: Session, invoice_id: int, current_user: User) -> InvoiceDetailResponse:
    """
    Get detailed invoice by ID with access control
    
    Args:
        db: Database session
        invoice_id: Invoice (Bill) ID
        current_user: Current authenticated user
    
    Returns:
        InvoiceDetailResponse: Detailed invoice information
    """
    bill = db.query(Bill).options(
        joinedload(Bill.bill_items),
        joinedload(Bill.patient).joinedload(PatientProfile.user),
        joinedload(Bill.hospital)
    ).filter(Bill.id == invoice_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Access control
    user_role = current_user.role.name
    
    if user_role == "Patient":
        if not current_user.patient_profile or bill.patient_profile_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="You can only view your own invoices")
    
    elif user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        if user_role == "Hospital_Admin":
            user_hospital_id = current_user.hospital.id
        else:
            user_hospital_id = current_user.staff_profile.hospital_id if current_user.staff_profile else None
        
        if bill.hospital_id != user_hospital_id:
            raise HTTPException(status_code=403, detail="You can only view invoices from your hospital")
    
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to view this invoice")
    
    return _build_invoice_detail_response(db, bill)


def get_hospital_invoices(db: Session, current_user: User, skip: int = 0, limit: int = 100) -> list[InvoiceResponse]:
    """
    Get all invoices for a hospital (admin only)
    
    Args:
        db: Database session
        current_user: Current authenticated admin user
        skip: Pagination offset
        limit: Pagination limit
    
    Returns:
        list[InvoiceResponse]: List of hospital invoices
    """
    user_role = current_user.role.name
    
    if user_role not in ["Hospital_Admin", "Receptionist", "Staff"]:
        raise HTTPException(status_code=403, detail="Only hospital staff can access this endpoint")
    
    # Determine hospital_id based on user role
    if user_role == "Hospital_Admin":
        hospital_id = current_user.hospital.id
    else:
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        hospital_id = current_user.staff_profile.hospital_id
    
    # Get all bills for the hospital
    bills = db.query(Bill).options(
        joinedload(Bill.patient).joinedload(PatientProfile.user),
        joinedload(Bill.hospital)
    ).filter(
        Bill.hospital_id == hospital_id
    ).offset(skip).limit(limit).all()
    
    return [_build_invoice_response(db, bill) for bill in bills]


def get_appointment_invoice(db: Session, appointment_id: int, current_user: User) -> InvoiceDetailResponse:
    """
    Get invoice for a specific appointment
    
    Args:
        db: Database session
        appointment_id: Appointment ID
        current_user: Current authenticated user
    
    Returns:
        InvoiceDetailResponse: Invoice for the appointment
    """
    # Find bill item with this appointment
    bill_item = db.query(BillItem).options(
        joinedload(BillItem.bill).joinedload(Bill.patient).joinedload(PatientProfile.user),
        joinedload(BillItem.bill).joinedload(Bill.hospital)
    ).filter(BillItem.appointment_id == appointment_id).first()
    
    if not bill_item:
        raise HTTPException(status_code=404, detail="No invoice found for this appointment")
    
    bill = bill_item.bill
    
    # Access control
    user_role = current_user.role.name
    
    if user_role == "Patient":
        if not current_user.patient_profile or bill.patient_profile_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="You can only view your own invoices")
    
    elif user_role in ["Hospital_Admin", "Receptionist", "Staff"]:
        if user_role == "Hospital_Admin":
            user_hospital_id = current_user.hospital.id
        else:
            user_hospital_id = current_user.staff_profile.hospital_id if current_user.staff_profile else None
        
        if bill.hospital_id != user_hospital_id:
            raise HTTPException(status_code=403, detail="You can only view invoices from your hospital")
    
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to view this invoice")
    
    return _build_invoice_detail_response(db, bill)


def generate_invoice_pdf(db: Session, invoice_id: int, current_user: User) -> StreamingResponse:
    """
    Generate a professional PDF invoice
    
    Args:
        db: Database session
        invoice_id: Invoice (Bill) ID
        current_user: Current authenticated user
    
    Returns:
        StreamingResponse: PDF file stream
    """
    # Get the invoice details
    invoice = get_invoice_by_id(db, invoice_id, current_user)
    
    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = styles['Normal']
    
    # Title
    title = Paragraph("INVOICE", title_style)
    elements.append(title)
    elements.append(Spacer(1, 6))
    
    # Invoice Info Header
    invoice_info_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Issue Date:', invoice.issue_date.strftime('%B %d, %Y')],
        ['Due Date:', invoice.due_date.strftime('%B %d, %Y')],
        ['Status:', invoice.status.upper()],
    ]
    
    invoice_info_table = Table(invoice_info_data, colWidths=[2*inch, 3*inch])
    invoice_info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#7f8c8d')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(invoice_info_table)
    elements.append(Spacer(1, 12))
    
    # Hospital and Patient Information
    info_data = [
        [Paragraph('<b>From:</b>', normal_style), Paragraph('<b>Bill To:</b>', normal_style)],
        [Paragraph(f'<b>{invoice.hospital_name}</b>', normal_style), 
         Paragraph(f'<b>{invoice.patient_name}</b>', normal_style)],
    ]
    
    if invoice.hospital_address:
        info_data.append([Paragraph(invoice.hospital_address, normal_style), ''])
    
    if invoice.patient_email:
        info_data.append(['', Paragraph(invoice.patient_email, normal_style)])
    
    info_table = Table(info_data, colWidths=[3*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 15))
    
    # Line Items Header
    elements.append(Paragraph('Services & Charges', heading_style))
    elements.append(Spacer(1, 6))
    
    # Line Items Table
    items_data = [
        ['Description', 'Service Date', 'ICD Code', 'Qty', 'Unit Price', 'Amount']
    ]
    
    for item in invoice.items:
        items_data.append([
            Paragraph(item.description[:50], normal_style),
            item.service_date.strftime('%m/%d/%Y'),
            item.icd_code or 'N/A',
            str(item.quantity),
            f'${item.unit_price:.2f}',
            f'${item.amount:.2f}'
        ])
    
    items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 0.8*inch, 0.5*inch, 0.9*inch, 0.9*inch])
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Qty
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),  # Prices
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ecf0f1')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 12))
    
    # Totals Section
    totals_data = [
        ['Subtotal:', f'${invoice.total_amount:.2f}'],
        ['Paid Amount:', f'${invoice.paid_amount:.2f}'],
        ['Outstanding Balance:', f'${invoice.outstanding_amount:.2f}'],
    ]
    
    totals_table = Table(totals_data, colWidths=[4.5*inch, 2*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -2), 'Helvetica'),
        ('FONTNAME', (1, -1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -2), 11),
        ('FONTSIZE', (0, -1), (-1, -1), 13),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#e74c3c')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#34495e')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(totals_table)
    elements.append(Spacer(1, 12))
    
    # Payment Status
    if invoice.status == 'paid':
        status_text = '<b><font color="#27ae60">PAID IN FULL</font></b>'
    elif invoice.status == 'overdue':
        status_text = '<b><font color="#e74c3c">OVERDUE - IMMEDIATE PAYMENT REQUIRED</font></b>'
    elif invoice.status == 'partially_paid':
        status_text = '<b><font color="#f39c12">PARTIALLY PAID</font></b>'
    else:
        status_text = '<b><font color="#3498db">PAYMENT PENDING</font></b>'
    
    # Payment Status with stamp (if paid)
    if invoice.status == 'paid':
        import os
        stamp_path = os.path.join('static', 'images', 'stamps', 'paid.png')
        if os.path.exists(stamp_path):
            try:
                # Combine status text and stamp in one row
                status_para = Paragraph(status_text, ParagraphStyle('status', parent=normal_style, alignment=TA_LEFT, fontSize=12))
                paid_stamp = Image(stamp_path, width=1.2*inch, height=1.2*inch)
                
                # Create table with status text on left and stamp on right
                status_stamp_table = Table([[status_para, paid_stamp]], colWidths=[4.5*inch, 2*inch])
                status_stamp_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                elements.append(status_stamp_table)
            except Exception as e:
                logger.warning(f"Could not add paid stamp: {str(e)}")
                # Fallback to text only
                status_para = Paragraph(status_text, ParagraphStyle('status', parent=normal_style, alignment=TA_CENTER, fontSize=12))
                elements.append(status_para)
        else:
            logger.info(f"Paid stamp not found at: {stamp_path}")
            status_para = Paragraph(status_text, ParagraphStyle('status', parent=normal_style, alignment=TA_CENTER, fontSize=12))
            elements.append(status_para)
    else:
        status_para = Paragraph(status_text, ParagraphStyle('status', parent=normal_style, alignment=TA_CENTER, fontSize=12))
        elements.append(status_para)
    
    elements.append(Spacer(1, 10))
    
    # Notes
    if invoice.notes:
        elements.append(Paragraph('<b>Notes:</b>', normal_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(invoice.notes, normal_style))
        elements.append(Spacer(1, 10))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=normal_style,
        fontSize=8,
        textColor=colors.HexColor('#7f8c8d'),
        alignment=TA_CENTER
    )
    
    footer_text = f'Thank you for your business!<br/>For questions about this invoice, please contact {invoice.hospital_name}'
    footer = Paragraph(footer_text, footer_style)
    elements.append(Spacer(1, 12))
    elements.append(footer)
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and return it
    buffer.seek(0)
    
    filename = f"invoice_{invoice.invoice_number}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# Helper functions

def _build_invoice_response(db: Session, bill: Bill) -> InvoiceResponse:
    """Build an InvoiceResponse from a Bill model"""
    # Get patient details
    patient_name = None
    patient_email = None
    if bill.patient and bill.patient.user:
        patient_user = bill.patient.user
        patient_name = f"{patient_user.first_name} {patient_user.last_name}"
        patient_email = patient_user.email
    
    # Get hospital details
    hospital_name = bill.hospital.name if bill.hospital else "Unknown Hospital"
    hospital_address = bill.hospital.address if bill.hospital and hasattr(bill.hospital, 'address') else None
    
    return InvoiceResponse(
        id=bill.id,
        invoice_number=bill.bill_number,
        patient_name=patient_name or "Unknown Patient",
        patient_email=patient_email,
        hospital_name=hospital_name,
        hospital_address=hospital_address,
        issue_date=bill.issue_date,
        due_date=bill.due_date,
        total_amount=bill.total_amount,
        paid_amount=bill.paid_amount,
        outstanding_amount=bill.outstanding_amount,
        status=bill.status.value,
        payment_method=bill.payment_method,
        notes=bill.notes
    )


def _build_invoice_detail_response(db: Session, bill: Bill) -> InvoiceDetailResponse:
    """Build an InvoiceDetailResponse from a Bill model with items"""
    # Get patient details
    patient_name = None
    patient_email = None
    if bill.patient and bill.patient.user:
        patient_user = bill.patient.user
        patient_name = f"{patient_user.first_name} {patient_user.last_name}"
        patient_email = patient_user.email
    
    # Get hospital details
    hospital_name = bill.hospital.name if bill.hospital else "Unknown Hospital"
    hospital_address = bill.hospital.address if bill.hospital and hasattr(bill.hospital, 'address') else None
    
    # Build invoice items
    items = [
        InvoiceItemResponse(
            description=item.description,
            icd_code=item.icd_code,
            icd_description=item.icd_description,
            service_date=item.service_date,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.amount
        )
        for item in bill.bill_items
    ]
    
    return InvoiceDetailResponse(
        id=bill.id,
        invoice_number=bill.bill_number,
        patient_name=patient_name or "Unknown Patient",
        patient_email=patient_email,
        hospital_name=hospital_name,
        hospital_address=hospital_address,
        issue_date=bill.issue_date,
        due_date=bill.due_date,
        total_amount=bill.total_amount,
        paid_amount=bill.paid_amount,
        outstanding_amount=bill.outstanding_amount,
        status=bill.status.value,
        payment_method=bill.payment_method,
        notes=bill.notes,
        items=items
    )
