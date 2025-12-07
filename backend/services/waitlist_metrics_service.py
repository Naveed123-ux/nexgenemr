"""
WaitlistMetricsService - Tracks and calculates performance metrics for the waitlist system
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, case
from datetime import datetime, timedelta, date
from typing import Dict, Optional, List
from models.waitlist_entry_model import WaitlistEntry, WaitlistStatus
from models.waitlist_booking_token_model import WaitlistBookingToken, TokenStatus


def get_average_time_to_booking(
    doctor_user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = None
) -> Dict:
    """
    Calculate average time from waitlist entry creation to booking.
    
    Args:
        doctor_user_id: Optional filter by specific doctor
        start_date: Optional start date for filtering entries
        end_date: Optional end date for filtering entries
        db: Database session
        
    Returns:
        Dictionary with average_days, total_booked_entries, and breakdown by priority
    """
    # Build base query for BOOKED entries
    query = db.query(WaitlistEntry).filter(
        WaitlistEntry.status == WaitlistStatus.BOOKED
    )
    
    # Apply filters
    if doctor_user_id:
        query = query.filter(WaitlistEntry.doctor_user_id == doctor_user_id)
    
    if start_date:
        query = query.filter(WaitlistEntry.created_at >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(WaitlistEntry.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    # Get all booked entries
    booked_entries = query.all()
    
    if not booked_entries:
        return {
            "average_days": 0,
            "total_booked_entries": 0,
            "high_priority_average_days": 0,
            "normal_priority_average_days": 0
        }
    
    # Calculate time differences
    total_days = 0
    high_priority_days = 0
    high_priority_count = 0
    normal_priority_days = 0
    normal_priority_count = 0
    
    for entry in booked_entries:
        # Calculate days from created_at to updated_at (when status changed to BOOKED)
        days_waiting = (entry.updated_at - entry.created_at).total_seconds() / 86400  # Convert to days
        total_days += days_waiting
        
        # Track by priority
        if entry.priority.value == "high":
            high_priority_days += days_waiting
            high_priority_count += 1
        else:
            normal_priority_days += days_waiting
            normal_priority_count += 1
    
    # Calculate averages
    average_days = total_days / len(booked_entries) if booked_entries else 0
    high_priority_avg = high_priority_days / high_priority_count if high_priority_count > 0 else 0
    normal_priority_avg = normal_priority_days / normal_priority_count if normal_priority_count > 0 else 0
    
    return {
        "average_days": round(average_days, 2),
        "total_booked_entries": len(booked_entries),
        "high_priority_average_days": round(high_priority_avg, 2),
        "normal_priority_average_days": round(normal_priority_avg, 2),
        "high_priority_count": high_priority_count,
        "normal_priority_count": normal_priority_count
    }


def get_invitation_acceptance_rate(
    doctor_user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = None
) -> Dict:
    """
    Calculate the rate at which patients accept waitlist invitations.
    
    Acceptance rate = (tokens used / tokens sent) * 100
    
    Args:
        doctor_user_id: Optional filter by specific doctor
        start_date: Optional start date for filtering tokens
        end_date: Optional end date for filtering tokens
        db: Database session
        
    Returns:
        Dictionary with acceptance_rate, total_invitations_sent, total_accepted
    """
    # Build base query for tokens
    query = db.query(WaitlistBookingToken)
    
    # Join with waitlist entry to filter by doctor if needed
    if doctor_user_id:
        query = query.join(WaitlistEntry).filter(
            WaitlistEntry.doctor_user_id == doctor_user_id
        )
    
    # Apply date filters
    if start_date:
        query = query.filter(
            WaitlistBookingToken.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    
    if end_date:
        query = query.filter(
            WaitlistBookingToken.created_at <= datetime.combine(end_date, datetime.max.time())
        )
    
    # Get all tokens (invitations sent)
    all_tokens = query.all()
    total_invitations = len(all_tokens)
    
    if total_invitations == 0:
        return {
            "acceptance_rate": 0,
            "total_invitations_sent": 0,
            "total_accepted": 0,
            "total_expired": 0,
            "total_cancelled": 0
        }
    
    # Count tokens by status
    used_count = sum(1 for token in all_tokens if token.status == TokenStatus.USED)
    expired_count = sum(1 for token in all_tokens if token.status == TokenStatus.EXPIRED)
    cancelled_count = sum(1 for token in all_tokens if token.status == TokenStatus.CANCELLED)
    
    # Calculate acceptance rate
    acceptance_rate = (used_count / total_invitations) * 100 if total_invitations > 0 else 0
    
    return {
        "acceptance_rate": round(acceptance_rate, 2),
        "total_invitations_sent": total_invitations,
        "total_accepted": used_count,
        "total_expired": expired_count,
        "total_cancelled": cancelled_count
    }


def get_slot_fill_rate_from_waitlist(
    doctor_user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = None
) -> Dict:
    """
    Calculate the rate at which slots are filled from the waitlist.
    
    This tracks how many appointments were created from waitlist entries
    compared to total waitlist entries.
    
    Args:
        doctor_user_id: Optional filter by specific doctor
        start_date: Optional start date for filtering entries
        end_date: Optional end date for filtering entries
        db: Database session
        
    Returns:
        Dictionary with fill_rate, total_entries, total_booked, total_pending, total_expired
    """
    # Build base query
    query = db.query(WaitlistEntry)
    
    # Apply filters
    if doctor_user_id:
        query = query.filter(WaitlistEntry.doctor_user_id == doctor_user_id)
    
    if start_date:
        query = query.filter(
            WaitlistEntry.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    
    if end_date:
        query = query.filter(
            WaitlistEntry.created_at <= datetime.combine(end_date, datetime.max.time())
        )
    
    # Get all entries
    all_entries = query.all()
    total_entries = len(all_entries)
    
    if total_entries == 0:
        return {
            "fill_rate": 0,
            "total_entries": 0,
            "total_booked": 0,
            "total_pending": 0,
            "total_expired": 0,
            "total_cancelled": 0,
            "total_invited": 0
        }
    
    # Count entries by status
    booked_count = sum(1 for entry in all_entries if entry.status == WaitlistStatus.BOOKED)
    pending_count = sum(1 for entry in all_entries if entry.status == WaitlistStatus.PENDING)
    expired_count = sum(1 for entry in all_entries if entry.status == WaitlistStatus.EXPIRED)
    cancelled_count = sum(1 for entry in all_entries if entry.status == WaitlistStatus.CANCELLED)
    invited_count = sum(1 for entry in all_entries if entry.status == WaitlistStatus.INVITED)
    
    # Calculate fill rate (booked / total)
    fill_rate = (booked_count / total_entries) * 100 if total_entries > 0 else 0
    
    return {
        "fill_rate": round(fill_rate, 2),
        "total_entries": total_entries,
        "total_booked": booked_count,
        "total_pending": pending_count,
        "total_expired": expired_count,
        "total_cancelled": cancelled_count,
        "total_invited": invited_count
    }


def get_waitlist_demand_trends(
    doctor_user_id: Optional[int] = None,
    days: int = 30,
    db: Session = None
) -> Dict:
    """
    Get waitlist demand trends over time.
    
    Args:
        doctor_user_id: Optional filter by specific doctor
        days: Number of days to look back (default 30)
        db: Database session
        
    Returns:
        Dictionary with daily entry counts and status distribution
    """
    # Calculate start date
    start_date = date.today() - timedelta(days=days)
    
    # Build query
    query = db.query(WaitlistEntry).filter(
        WaitlistEntry.created_at >= datetime.combine(start_date, datetime.min.time())
    )
    
    if doctor_user_id:
        query = query.filter(WaitlistEntry.doctor_user_id == doctor_user_id)
    
    # Get all entries
    entries = query.all()
    
    # Group by date
    daily_counts = {}
    for entry in entries:
        entry_date = entry.created_at.date().isoformat()
        if entry_date not in daily_counts:
            daily_counts[entry_date] = {
                "total": 0,
                "high_priority": 0,
                "normal_priority": 0
            }
        
        daily_counts[entry_date]["total"] += 1
        if entry.priority.value == "high":
            daily_counts[entry_date]["high_priority"] += 1
        else:
            daily_counts[entry_date]["normal_priority"] += 1
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": date.today().isoformat(),
        "days": days,
        "daily_counts": daily_counts,
        "total_entries": len(entries)
    }


def get_comprehensive_metrics(
    doctor_user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = None
) -> Dict:
    """
    Get comprehensive waitlist metrics in a single call.
    
    Args:
        doctor_user_id: Optional filter by specific doctor
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        db: Database session
        
    Returns:
        Dictionary with all metrics combined
    """
    return {
        "time_to_booking": get_average_time_to_booking(
            doctor_user_id=doctor_user_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        ),
        "invitation_acceptance": get_invitation_acceptance_rate(
            doctor_user_id=doctor_user_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        ),
        "slot_fill_rate": get_slot_fill_rate_from_waitlist(
            doctor_user_id=doctor_user_id,
            start_date=start_date,
            end_date=end_date,
            db=db
        ),
        "demand_trends": get_waitlist_demand_trends(
            doctor_user_id=doctor_user_id,
            days=30,
            db=db
        )
    }
