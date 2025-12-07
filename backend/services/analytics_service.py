# backend/services/analytics_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from fastapi import HTTPException
from datetime import datetime, timedelta
from models.user_model import User
from models.hospital_model import Hospital
from models.patient_profile_model import PatientProfile
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.appointment_model import Appointment
from models.appointment_request_model import AppointmentRequest
from models.billing_model import Bill, BillItem, BillingStatus
from models.claim_model import Claim
from models.prescription_model import Prescription
from models.lab_result_model import LabResult
from models.soap_note_model import SoapNote
from models.department_model import Department
import logging

logger = logging.getLogger(__name__)


def get_hospital_overview(db: Session, current_user: User) -> dict:
    """
    Get comprehensive hospital overview with key metrics
    
    Args:
        db: Database session
        current_user: Current authenticated user (Hospital Admin)
    
    Returns:
        dict: Complete hospital overview with all metrics
    """
    # Verify user is hospital admin
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    
    # Get counts
    total_patients = db.query(PatientProfile).filter(
        PatientProfile.hospital_id == hospital_id
    ).count()
    
    total_doctors = db.query(DoctorProfile).join(
        Department, DoctorProfile.department_id == Department.id
    ).filter(
        Department.hospital_id == hospital_id
    ).count()
    
    total_staff = db.query(StaffProfile).filter(
        StaffProfile.hospital_id == hospital_id
    ).count()
    
    total_departments = db.query(Department).filter(
        Department.hospital_id == hospital_id
    ).count()
    
    # Appointment metrics
    total_appointments = db.query(Appointment).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(PatientProfile.hospital_id == hospital_id).count()
    
    # Get appointments by status
    appointments_by_status = db.query(
        Appointment.status,
        func.count(Appointment.id)
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Appointment.status).all()
    
    # Billing metrics
    total_bills = db.query(Bill).filter(
        Bill.hospital_id == hospital_id
    ).count()
    
    total_revenue = db.query(func.sum(Bill.total_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    total_collected = db.query(func.sum(Bill.paid_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    total_outstanding = db.query(func.sum(Bill.outstanding_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    # Bills by status
    bills_by_status = db.query(
        Bill.status,
        func.count(Bill.id)
    ).filter(
        Bill.hospital_id == hospital_id
    ).group_by(Bill.status).all()
    
    # Claims metrics (join through Appointment -> PatientProfile to get hospital_id)
    total_claims = db.query(Claim).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).count()
    
    claims_by_status = db.query(
        Claim.status,
        func.count(Claim.id)
    ).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Claim.status).all()
    
    # Recent activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    new_patients_30d = db.query(PatientProfile).join(
        User, PatientProfile.user_id == User.id
    ).filter(
        PatientProfile.hospital_id == hospital_id,
        User.created_at >= thirty_days_ago.isoformat()
    ).count()
    
    # Note: Appointment model doesn't have created_at, so we count all recent appointments
    # This could be improved by adding a created_at field to Appointment model
    appointments_30d = 0  # Placeholder - would need created_at field
    
    revenue_30d = db.query(func.sum(Bill.paid_amount)).filter(
        Bill.hospital_id == hospital_id,
        Bill.paid_date >= thirty_days_ago
    ).scalar() or 0.0
    
    return {
        "hospital_id": hospital_id,
        "hospital_name": current_user.hospital.name,
        "overview": {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_staff": total_staff,
            "total_departments": total_departments,
            "total_appointments": total_appointments,
            "total_bills": total_bills
        },
        "appointments": {
            "total": total_appointments,
            "by_status": {status: count for status, count in appointments_by_status}
        },
        "financial": {
            "total_revenue": round(total_revenue, 2),
            "total_collected": round(total_collected, 2),
            "total_outstanding": round(total_outstanding, 2),
            "collection_rate": round((total_collected / total_revenue * 100) if total_revenue > 0 else 0, 2),
            "bills_by_status": {status.value: count for status, count in bills_by_status}
        },
        "claims": {
            "total": total_claims,
            "by_status": {status: count for status, count in claims_by_status}
        },
        "recent_activity_30d": {
            "new_patients": new_patients_30d,
            "appointments": appointments_30d,
            "revenue": round(revenue_30d, 2)
        },
        "generated_at": datetime.utcnow().isoformat()
    }


def get_patient_analytics(db: Session, current_user: User) -> dict:
    """
    Get detailed patient analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    
    # Total patients
    total_patients = db.query(PatientProfile).filter(
        PatientProfile.hospital_id == hospital_id
    ).count()
    
    # Patients by billing type
    # Note: billing_type is encrypted, so we need to fetch and decrypt
    all_patients = db.query(PatientProfile).filter(
        PatientProfile.hospital_id == hospital_id
    ).all()
    
    billing_type_counts = {}
    for patient in all_patients:
        billing_type = patient.billing_type or "Not specified"
        billing_type_counts[billing_type] = billing_type_counts.get(billing_type, 0) + 1
    
    patients_by_billing = list(billing_type_counts.items())
    
    # Note: User model doesn't have gender or date_of_birth fields
    # Gender and age analytics removed
    
    # New patients trend (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    new_patients_trend = []
    
    for i in range(6):
        month_start = datetime.utcnow() - timedelta(days=30 * (5 - i))
        month_end = datetime.utcnow() - timedelta(days=30 * (4 - i))
        
        count = db.query(PatientProfile).join(
            User, PatientProfile.user_id == User.id
        ).filter(
            PatientProfile.hospital_id == hospital_id,
            User.created_at >= month_start.isoformat(),
            User.created_at < month_end.isoformat()
        ).count()
        
        new_patients_trend.append({
            "month": month_start.strftime("%B %Y"),
            "count": count
        })
    
    # Most common diagnoses (from appointments with ICD codes)
    top_diagnoses = db.query(
        Appointment.icd_code_id,
        func.count(Appointment.id).label('count')
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id,
        Appointment.icd_code_id.isnot(None)
    ).group_by(
        Appointment.icd_code_id
    ).order_by(
        func.count(Appointment.id).desc()
    ).limit(10).all()
    
    return {
        "total_patients": total_patients,
        "by_billing_type": {billing_type: count for billing_type, count in patients_by_billing},
        "new_patients_trend": new_patients_trend,
        "top_diagnoses_count": len(top_diagnoses)
    }


def get_doctor_analytics(db: Session, current_user: User) -> dict:
    """
    Get detailed doctor analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    
    # Total doctors (join through department to get hospital_id)
    total_doctors = db.query(DoctorProfile).join(
        Department, DoctorProfile.department_id == Department.id
    ).filter(
        Department.hospital_id == hospital_id
    ).count()
    
    # Doctors by department
    # Note: Department.name is encrypted, fetch and decrypt
    departments = db.query(Department).filter(
        Department.hospital_id == hospital_id
    ).all()
    
    doctors_by_dept = []
    for dept in departments:
        doctor_count = db.query(DoctorProfile).filter(
            DoctorProfile.department_id == dept.id
        ).count()
        if doctor_count > 0:
            doctors_by_dept.append((dept.name, doctor_count))
    
    # Doctors by specialization
    # Note: specialization is encrypted, fetch and decrypt
    all_doctors = db.query(DoctorProfile).join(
        Department, DoctorProfile.department_id == Department.id
    ).filter(
        Department.hospital_id == hospital_id
    ).all()
    
    spec_counts = {}
    for doctor in all_doctors:
        spec = doctor.specialization or "General"
        spec_counts[spec] = spec_counts.get(spec, 0) + 1
    
    doctors_by_spec = list(spec_counts.items())
    
    # Doctor performance (appointments count)
    # Note: User names are encrypted, need to fetch and decrypt
    doctor_appointment_counts = db.query(
        User.id,
        func.count(Appointment.id).label('appointment_count')
    ).join(
        Appointment, Appointment.doctor_user_id == User.id
    ).join(
        DoctorProfile, DoctorProfile.user_id == User.id
    ).join(
        Department, DoctorProfile.department_id == Department.id
    ).filter(
        Department.hospital_id == hospital_id
    ).group_by(
        User.id
    ).order_by(
        func.count(Appointment.id).desc()
    ).limit(10).all()
    
    doctor_performance = []
    for user_id, count in doctor_appointment_counts:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            doctor_performance.append((
                user.first_name,
                user.last_name,
                count
            ))
    
    # Average appointments per doctor
    # Calculate manually since we can't nest aggregate functions
    if total_doctors > 0:
        total_appointments_for_doctors = db.query(
            func.count(Appointment.id)
        ).join(
            User, Appointment.doctor_user_id == User.id
        ).join(
            DoctorProfile, DoctorProfile.user_id == User.id
        ).join(
            Department, DoctorProfile.department_id == Department.id
        ).filter(
            Department.hospital_id == hospital_id
        ).scalar() or 0
        avg_appointments = total_appointments_for_doctors / total_doctors
    else:
        avg_appointments = 0
    
    return {
        "total_doctors": total_doctors,
        "by_department": {dept: count for dept, count in doctors_by_dept},
        "by_specialization": {spec or "General": count for spec, count in doctors_by_spec},
        "top_performers": [
            {
                "name": f"{first_name} {last_name}",
                "appointments": count
            }
            for first_name, last_name, count in doctor_performance
        ],
        "average_appointments_per_doctor": round(float(avg_appointments), 2)
    }


def get_appointment_analytics(db: Session, current_user: User, days: int = 30) -> dict:
    """
    Get detailed appointment analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total appointments
    total_appointments = db.query(Appointment).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).count()
    
    # Note: Appointment model doesn't have created_at field
    # Showing all-time stats instead of period-specific
    appointments_in_period = total_appointments
    
    # By status (all time)
    by_status = db.query(
        Appointment.status,
        func.count(Appointment.id)
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Appointment.status).all()
    
    # By type (telehealth vs in-person)
    by_type = db.query(
        Appointment.is_telehealth,
        func.count(Appointment.id)
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Appointment.is_telehealth).all()
    
    # Daily trend - not available without created_at field
    daily_trend = []
    
    # Cancellation rate (all time)
    cancelled = db.query(Appointment).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id,
        Appointment.status == 'cancelled'
    ).count()
    
    cancellation_rate = (cancelled / appointments_in_period * 100) if appointments_in_period > 0 else 0
    
    return {
        "total_appointments": total_appointments,
        "period_days": days,
        "appointments_in_period": appointments_in_period,
        "by_status": {status: count for status, count in by_status},
        "by_type": {
            "telehealth": next((count for is_tele, count in by_type if is_tele), 0),
            "in_person": next((count for is_tele, count in by_type if not is_tele), 0)
        },
        "daily_trend": [
            {"date": date.isoformat(), "count": count}
            for date, count in daily_trend
        ],
        "cancellation_rate": round(cancellation_rate, 2)
    }


def get_financial_analytics(db: Session, current_user: User, days: int = 30) -> dict:
    """
    Get detailed financial analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total financial metrics
    total_billed = db.query(func.sum(Bill.total_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    total_collected = db.query(func.sum(Bill.paid_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    total_outstanding = db.query(func.sum(Bill.outstanding_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    # Period metrics
    period_billed = db.query(func.sum(Bill.total_amount)).filter(
        Bill.hospital_id == hospital_id,
        Bill.created_at >= start_date
    ).scalar() or 0.0
    
    period_collected = db.query(func.sum(Bill.paid_amount)).filter(
        Bill.hospital_id == hospital_id,
        Bill.paid_date >= start_date
    ).scalar() or 0.0
    
    # Bills by status
    bills_by_status = db.query(
        Bill.status,
        func.count(Bill.id),
        func.sum(Bill.outstanding_amount)
    ).filter(
        Bill.hospital_id == hospital_id
    ).group_by(Bill.status).all()
    
    # Overdue bills
    overdue_bills = db.query(
        func.count(Bill.id),
        func.sum(Bill.outstanding_amount)
    ).filter(
        Bill.hospital_id == hospital_id,
        Bill.due_date < datetime.utcnow(),
        Bill.status.in_([BillingStatus.pending, BillingStatus.partially_paid])
    ).first()
    
    # Revenue trend
    revenue_trend = db.query(
        func.date(Bill.paid_date).label('date'),
        func.sum(Bill.paid_amount).label('amount')
    ).filter(
        Bill.hospital_id == hospital_id,
        Bill.paid_date >= start_date,
        Bill.paid_date.isnot(None)
    ).group_by(
        func.date(Bill.paid_date)
    ).order_by(
        func.date(Bill.paid_date)
    ).all()
    
    # Average bill amount
    avg_bill = db.query(func.avg(Bill.total_amount)).filter(
        Bill.hospital_id == hospital_id
    ).scalar() or 0.0
    
    # Payment methods
    payment_methods = db.query(
        Bill.payment_method,
        func.count(Bill.id),
        func.sum(Bill.paid_amount)
    ).filter(
        Bill.hospital_id == hospital_id,
        Bill.payment_method.isnot(None)
    ).group_by(Bill.payment_method).all()
    
    return {
        "total_metrics": {
            "total_billed": round(total_billed, 2),
            "total_collected": round(total_collected, 2),
            "total_outstanding": round(total_outstanding, 2),
            "collection_rate": round((total_collected / total_billed * 100) if total_billed > 0 else 0, 2)
        },
        "period_metrics": {
            "days": days,
            "billed": round(period_billed, 2),
            "collected": round(period_collected, 2)
        },
        "bills_by_status": {
            status.value: {
                "count": count,
                "outstanding": round(float(outstanding or 0), 2)
            }
            for status, count, outstanding in bills_by_status
        },
        "overdue": {
            "count": overdue_bills[0] or 0,
            "amount": round(float(overdue_bills[1] or 0), 2)
        },
        "revenue_trend": [
            {"date": date.isoformat(), "amount": round(float(amount), 2)}
            for date, amount in revenue_trend
        ],
        "average_bill_amount": round(float(avg_bill), 2),
        "payment_methods": {
            method: {
                "count": count,
                "total": round(float(total), 2)
            }
            for method, count, total in payment_methods
        }
    }


def get_claims_analytics(db: Session, current_user: User) -> dict:
    """
    Get detailed claims analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    
    # Total claims (join through Appointment -> PatientProfile)
    total_claims = db.query(Claim).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).count()
    
    # Claims by status
    claims_by_status = db.query(
        Claim.status,
        func.count(Claim.id)
    ).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Claim.status).all()
    
    # Claims by insurance
    claims_by_insurance = db.query(
        Claim.insurance_company,
        func.count(Claim.id)
    ).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id
    ).group_by(Claim.insurance_company).all()
    
    # Approval rate
    approved = db.query(Claim).join(
        Appointment, Claim.appointment_id == Appointment.id
    ).join(
        PatientProfile, Appointment.patient_profile_id == PatientProfile.id
    ).filter(
        PatientProfile.hospital_id == hospital_id,
        Claim.status == 'paid'  # Note: ClaimStatus uses 'paid' not 'approved'
    ).count()
    
    approval_rate = (approved / total_claims * 100) if total_claims > 0 else 0
    
    return {
        "total_claims": total_claims,
        "by_status": {status: count for status, count in claims_by_status},
        "by_insurance": {insurance: count for insurance, count in claims_by_insurance},
        "approval_rate": round(approval_rate, 2)
    }


def get_department_analytics(db: Session, current_user: User) -> dict:
    """
    Get department-wise analytics
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    hospital_id = current_user.hospital.id
    
    departments = db.query(Department).filter(
        Department.hospital_id == hospital_id
    ).all()
    
    department_stats = []
    
    for dept in departments:
        # Doctors in department
        doctor_count = db.query(DoctorProfile).filter(
            DoctorProfile.department_id == dept.id
        ).count()
        
        # Appointments in department
        appointment_count = db.query(Appointment).join(
            User, Appointment.doctor_user_id == User.id
        ).join(
            DoctorProfile, DoctorProfile.user_id == User.id
        ).filter(
            DoctorProfile.department_id == dept.id
        ).count()
        
        department_stats.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "doctors": doctor_count,
            "appointments": appointment_count
        })
    
    return {
        "total_departments": len(departments),
        "departments": department_stats
    }


def get_complete_dashboard(db: Session, current_user: User) -> dict:
    """
    Get complete dashboard with all analytics combined
    """
    if current_user.role.name != "Hospital_Admin":
        raise HTTPException(status_code=403, detail="Only hospital admins can access analytics")
    
    logger.info(f"Generating complete analytics dashboard for hospital {current_user.hospital.id}")
    
    return {
        "overview": get_hospital_overview(db, current_user),
        "patients": get_patient_analytics(db, current_user),
        "doctors": get_doctor_analytics(db, current_user),
        "appointments": get_appointment_analytics(db, current_user, days=30),
        "financial": get_financial_analytics(db, current_user, days=30),
        "claims": get_claims_analytics(db, current_user),
        "departments": get_department_analytics(db, current_user),
        "generated_at": datetime.utcnow().isoformat()
    }
