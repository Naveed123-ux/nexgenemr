from apscheduler.schedulers.background import BackgroundScheduler
from services.appointment_service import send_daily_appointment_reminders
from services.waitlist_service import expire_old_entries
from services.waitlist_token_service import expire_old_tokens
from services.waitlist_notification_service import send_waitlist_expiry_notification
from db.db import get_db

scheduler = BackgroundScheduler(timezone="Asia/Karachi") # Set to your local timezone


def expire_waitlist_entries_job():
    """
    Daily job to expire old waitlist entries and send notifications.
    Runs at midnight every day.
    """
    db = next(get_db())
    try:
        # Call WaitlistService.expire_old_entries
        count = expire_old_entries(db)
        
        # Send expiry notifications for newly expired entries
        if count > 0:
            from models.waitlist_entry_model import WaitlistEntry, WaitlistStatus
            from datetime import date
            from sqlalchemy import and_
            
            # Get entries that were just expired today
            today = date.today()
            expired_today = db.query(WaitlistEntry).filter(
                and_(
                    WaitlistEntry.status == WaitlistStatus.EXPIRED,
                    WaitlistEntry.expiry_date == today
                )
            ).all()
            
            # Send notifications
            notification_count = 0
            for entry in expired_today:
                try:
                    success = send_waitlist_expiry_notification(entry, db)
                    if success:
                        notification_count += 1
                except Exception as e:
                    print(f"[ERROR] Failed to send expiry notification for entry {entry.id}: {str(e)}")
            
            print(f"[SCHEDULER] Expired {count} waitlist entries. Sent {notification_count} notifications.")
        else:
            print(f"[SCHEDULER] No waitlist entries to expire.")
    except Exception as e:
        print(f"[ERROR] Failed to expire waitlist entries: {str(e)}")
    finally:
        db.close()


def expire_booking_tokens_job():
    """
    Hourly job to expire old booking tokens.
    """
    db = next(get_db())
    try:
        # Call WaitlistTokenService.expire_old_tokens
        count = expire_old_tokens(db)
        
        # Log count of expired tokens
        if count > 0:
            print(f"[SCHEDULER] Expired {count} booking tokens.")
        else:
            print(f"[SCHEDULER] No booking tokens to expire.")
    except Exception as e:
        print(f"[ERROR] Failed to expire booking tokens: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """
    Starts the scheduler and adds all scheduled jobs.
    """
    # Daily appointment reminders at 9:00 AM
    scheduler.add_job(
        send_daily_appointment_reminders,
        trigger='cron',
        hour=9,
        minute=0,
        id='daily_appointment_reminders',
        name='Send daily appointment reminders'
    )
    
    # Daily waitlist entry expiry at midnight
    scheduler.add_job(
        expire_waitlist_entries_job,
        trigger='cron',
        hour=0,
        minute=0,
        id='expire_waitlist_entries',
        name='Expire old waitlist entries'
    )
    
    # Hourly booking token expiry
    scheduler.add_job(
        expire_booking_tokens_job,
        trigger='cron',
        hour='*',
        minute=0,
        id='expire_booking_tokens',
        name='Expire old booking tokens'
    )
    
    scheduler.start()
    print("--- Background scheduler started. Daily jobs are active. ---")

def stop_scheduler():
    """
    Stops the scheduler gracefully.
    """
    scheduler.shutdown()
    print("--- 🛑 Background scheduler stopped. ---")