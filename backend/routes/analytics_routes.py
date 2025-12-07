# backend/routes/analytics_routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from db.db import get_db
from models.user_model import User
from utils.dependencies import get_current_user
from services import analytics_service

router = APIRouter()


@router.get("/dashboard")
def get_complete_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete analytics dashboard with all metrics.
    
    This endpoint provides a comprehensive overview of the entire hospital
    including patients, doctors, appointments, financial data, claims, and departments.
    
    **Access**: Hospital Admin only
    
    **Returns**: Complete dashboard with:
    - Hospital overview (counts, totals, recent activity)
    - Patient analytics (demographics, trends, diagnoses)
    - Doctor analytics (performance, specializations, departments)
    - Appointment analytics (status, types, trends, cancellation rate)
    - Financial analytics (revenue, collections, outstanding, trends)
    - Claims analytics (status, insurance companies, approval rate)
    - Department analytics (doctors per department, appointments)
    
    **Use Case**: Main admin dashboard showing all hospital metrics at a glance
    
    **Example Response**:
    ```json
    {
      "overview": {
        "hospital_name": "City Hospital",
        "overview": {
          "total_patients": 1250,
          "total_doctors": 45,
          "total_staff": 120,
          "total_departments": 8
        },
        "financial": {
          "total_revenue": 450000.00,
          "total_collected": 380000.00,
          "collection_rate": 84.44
        }
      },
      "patients": {...},
      "doctors": {...},
      "appointments": {...},
      "financial": {...},
      "claims": {...},
      "departments": {...}
    }
    ```
    """
    return analytics_service.get_complete_dashboard(db, current_user)


@router.get("/overview")
def get_hospital_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get high-level hospital overview with key metrics.
    
    **Access**: Hospital Admin only
    
    **Returns**:
    - Total counts (patients, doctors, staff, departments, appointments, bills)
    - Appointment statistics by status
    - Financial summary (revenue, collected, outstanding, collection rate)
    - Claims summary by status
    - Recent activity (last 30 days)
    
    **Use Case**: Quick overview widget or summary card
    """
    return analytics_service.get_hospital_overview(db, current_user)


@router.get("/patients")
def get_patient_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed patient analytics and demographics.
    
    **Access**: Hospital Admin only
    
    **Returns**:
    - Total patient count
    - Patients by billing type (self-pay, insurance, etc.)
    - Patients by gender distribution
    - Age distribution (0-18, 19-35, 36-50, 51-65, 65+)
    - New patients trend (last 6 months)
    - Top diagnoses count
    
    **Use Case**: Patient demographics dashboard, population health analysis
    
    **Example Response**:
    ```json
    {
      "total_patients": 1250,
      "by_billing_type": {
        "self-pay": 450,
        "insurance": 800
      },
      "by_gender": {
        "Male": 600,
        "Female": 650
      },
      "age_distribution": {
        "0-18": 200,
        "19-35": 400,
        "36-50": 350,
        "51-65": 200,
        "65+": 100
      },
      "new_patients_trend": [...]
    }
    ```
    """
    return analytics_service.get_patient_analytics(db, current_user)


@router.get("/doctors")
def get_doctor_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed doctor analytics and performance metrics.
    
    **Access**: Hospital Admin only
    
    **Returns**:
    - Total doctor count
    - Doctors by department
    - Doctors by specialization
    - Top performing doctors (by appointment count)
    - Average appointments per doctor
    
    **Use Case**: Doctor performance dashboard, resource allocation
    
    **Example Response**:
    ```json
    {
      "total_doctors": 45,
      "by_department": {
        "Cardiology": 8,
        "Pediatrics": 12,
        "General Medicine": 15
      },
      "by_specialization": {
        "Cardiologist": 8,
        "Pediatrician": 12
      },
      "top_performers": [
        {
          "name": "Dr. John Smith",
          "appointments": 450
        }
      ],
      "average_appointments_per_doctor": 125.5
    }
    ```
    """
    return analytics_service.get_doctor_analytics(db, current_user)


@router.get("/appointments")
def get_appointment_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed appointment analytics for a specified period.
    
    **Access**: Hospital Admin only
    
    **Query Parameters**:
    - `days`: Number of days to analyze (default: 30, max: 365)
    
    **Returns**:
    - Total appointments (all time)
    - Appointments in specified period
    - Appointments by status (scheduled, completed, cancelled, etc.)
    - Appointments by type (telehealth vs in-person)
    - Daily appointment trend
    - Cancellation rate
    
    **Use Case**: Appointment scheduling analysis, capacity planning
    
    **Example Response**:
    ```json
    {
      "total_appointments": 5000,
      "period_days": 30,
      "appointments_in_period": 450,
      "by_status": {
        "scheduled": 120,
        "completed": 280,
        "cancelled": 50
      },
      "by_type": {
        "telehealth": 180,
        "in_person": 270
      },
      "daily_trend": [
        {"date": "2025-10-01", "count": 15},
        {"date": "2025-10-02", "count": 18}
      ],
      "cancellation_rate": 11.11
    }
    ```
    """
    return analytics_service.get_appointment_analytics(db, current_user, days)


@router.get("/financial")
def get_financial_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed financial analytics and revenue metrics.
    
    **Access**: Hospital Admin only
    
    **Query Parameters**:
    - `days`: Number of days to analyze (default: 30, max: 365)
    
    **Returns**:
    - Total metrics (all time billed, collected, outstanding, collection rate)
    - Period metrics (billed and collected in specified period)
    - Bills by status (with counts and outstanding amounts)
    - Overdue bills (count and amount)
    - Revenue trend (daily revenue over period)
    - Average bill amount
    - Payment methods breakdown
    
    **Use Case**: Financial dashboard, revenue analysis, collections management
    
    **Example Response**:
    ```json
    {
      "total_metrics": {
        "total_billed": 450000.00,
        "total_collected": 380000.00,
        "total_outstanding": 70000.00,
        "collection_rate": 84.44
      },
      "period_metrics": {
        "days": 30,
        "billed": 45000.00,
        "collected": 38000.00
      },
      "bills_by_status": {
        "pending": {"count": 120, "outstanding": 35000.00},
        "paid": {"count": 450, "outstanding": 0.00}
      },
      "overdue": {
        "count": 25,
        "amount": 12000.00
      },
      "revenue_trend": [
        {"date": "2025-10-01", "amount": 1250.00}
      ],
      "average_bill_amount": 385.50,
      "payment_methods": {
        "stripe": {"count": 350, "total": 320000.00},
        "cash": {"count": 100, "total": 60000.00}
      }
    }
    ```
    """
    return analytics_service.get_financial_analytics(db, current_user, days)


@router.get("/claims")
def get_claims_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed claims analytics and insurance metrics.
    
    **Access**: Hospital Admin only
    
    **Returns**:
    - Total claims count
    - Claims by status (pending, approved, denied, etc.)
    - Claims by insurance company
    - Approval rate percentage
    
    **Use Case**: Claims management dashboard, insurance relationship analysis
    
    **Example Response**:
    ```json
    {
      "total_claims": 850,
      "by_status": {
        "pending": 120,
        "approved": 650,
        "denied": 80
      },
      "by_insurance": {
        "Blue Cross": 350,
        "Aetna": 250,
        "UnitedHealth": 250
      },
      "approval_rate": 76.47
    }
    ```
    """
    return analytics_service.get_claims_analytics(db, current_user)


@router.get("/departments")
def get_department_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get department-wise analytics and resource distribution.
    
    **Access**: Hospital Admin only
    
    **Returns**:
    - Total departments count
    - Per department statistics:
      - Department name
      - Number of doctors
      - Number of appointments
    
    **Use Case**: Department performance analysis, resource allocation planning
    
    **Example Response**:
    ```json
    {
      "total_departments": 8,
      "departments": [
        {
          "department_id": 1,
          "department_name": "Cardiology",
          "doctors": 8,
          "appointments": 450
        },
        {
          "department_id": 2,
          "department_name": "Pediatrics",
          "doctors": 12,
          "appointments": 680
        }
      ]
    }
    ```
    """
    return analytics_service.get_department_analytics(db, current_user)


@router.get("/summary")
def get_quick_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quick summary with most important metrics only.
    
    This is a lightweight endpoint for quick dashboard updates or mobile apps.
    
    **Access**: Hospital Admin only
    
    **Returns**: Condensed version of overview with only key metrics
    
    **Use Case**: Mobile dashboard, quick status check, header statistics
    """
    overview = analytics_service.get_hospital_overview(db, current_user)
    
    return {
        "hospital_name": overview["hospital_name"],
        "patients": overview["overview"]["total_patients"],
        "doctors": overview["overview"]["total_doctors"],
        "appointments_today": overview["recent_activity_30d"]["appointments"],
        "revenue_30d": overview["recent_activity_30d"]["revenue"],
        "outstanding_bills": overview["financial"]["total_outstanding"],
        "collection_rate": overview["financial"]["collection_rate"]
    }
