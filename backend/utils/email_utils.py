import smtplib
import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from datetime import datetime  # <-- ADD THIS IMPORT

load_dotenv()

def get_logo_base64():
    """
    Reads the Nexgenemr.svg file from the project root,
    encodes it in Base64, and returns a data URI.
    """
    try:
        with open("nexgen.png", "rb") as f:
            svg_data = f.read()
            base64_encoded_data = base64.b64encode(svg_data).decode('utf-8')
            return f"data:image/png;base64,{base64_encoded_data}"
    except FileNotFoundError:
        print("WARNING: nexgen.png not found in the project root. Logo will be missing from emails.")
        return "" # Return an empty string if the logo is not found

LOGO_BASE64 = get_logo_base64()
ACCENT_COLOR = "#388fe5"

def create_html_template(subject, preheader, content_html):
    """
    Creates a beautiful, responsive HTML email template.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4; }}
            .container {{ width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }}
            .header {{ background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #dddddd; }}
            .header img {{ height: 40px; }}
            .content {{ padding: 30px; color: #333333; line-height: 1.6; }}
            .content h1 {{ color: #333333; font-size: 24px; margin-top: 0; }}
            .content p {{ margin: 0 0 15px; }}
            .info-box {{ background-color: #f9f9f9; border-left: 5px solid {ACCENT_COLOR}; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; background-color: {ACCENT_COLOR}; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; }}
            .footer {{ background-color: #f4f4f4; color: #888888; text-align: center; padding: 20px; font-size: 12px; }}
        </style>
    </head>
    <body>
        <span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
            {preheader}
        </span>
        <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #f4f4f4;">
            <tr>
                <td>
                    <table class="container" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="header">
                                <img src="{LOGO_BASE64}" alt="Nexgen Logo">
                            </td>
                        </tr>
                        <tr>
                            <td class="content">
                                {content_html}
                            </td>
                        </tr>
                        <tr>
                            <td class="footer">
                                &copy; {datetime.now().year} Nexgen. All rights reserved.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def _send_email(recipient_email, subject, html_body):
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASS")

    if not email_user or not email_pass:
        print("WARNING: Email credentials not found in .env. Cannot send email.")
        return False

    message = MIMEMultipart()
    message["From"] = email_user
    message["To"] = recipient_email
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email_user, email_pass)
        server.sendmail(email_user, recipient_email, message.as_string())
        server.quit()
        print(f"Successfully sent email to {recipient_email}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {recipient_email}. Error: {e}")
        return False

def send_welcome_email(recipient_email: str, temporary_password: str):
    subject = "Welcome to Nexgen - Your Account Details"
    preheader = "Your new account is ready."
    content_html = f"""
        <h1>Welcome Aboard!</h1>
        <p>An account has been created for you on the Nexgen platform. We're thrilled to have you with us.</p>
        <p>You can log in using the following credentials:</p>
        <div class="info-box">
            <p><strong>Email:</strong> {recipient_email}</p>
            <p><strong>Temporary Password:</strong> {temporary_password}</p>
        </div>
        <p>For your security, we highly recommend you change this password after your first login.</p>
    """
    html_body = create_html_template(subject, preheader, content_html)
    _send_email(recipient_email, subject, html_body)

def send_appointment_confirmation_email(
    recipient_email: str, 
    patient_name: str, 
    doctor_name: str, 
    appointment_time: str, 
    is_telehealth: bool, 
    meet_link: str = None, 
    hospital_address: str = None
):
    subject = "Your Appointment is Confirmed"
    preheader = f"Your appointment with {doctor_name} is set for {appointment_time}."
    
    appointment_details = ""
    if is_telehealth:
        appointment_details = f"""
            <p>This email confirms your <strong>telehealth appointment</strong>.</p>
            <div class="info-box">
                <p>Please use the button below to join the video call at the scheduled time.</p>
                <a href="{meet_link}" class="button" target="_blank">Join Google Meet</a>
            </div>
        """
    else:
        appointment_details = f"""
            <p>This email confirms your <strong>in-person appointment</strong>.</p>
            <div class="info-box">
                <p><strong>Location:</strong><br>{hospital_address}</p>
                <p>Please plan to arrive 15 minutes early.</p>
            </div>
        """

    content_html = f"""
        <h1>Appointment Confirmed</h1>
        <p>Hello {patient_name},</p>
        <p>Your appointment with <strong>{doctor_name}</strong> on <strong>{appointment_time}</strong> has been successfully scheduled.</p>
        {appointment_details}
        <p>If you need to reschedule, please contact our office directly.</p>
    """
    html_body = create_html_template(subject, preheader, content_html)
    _send_email(recipient_email, subject, html_body)


def send_appointment_reminder_email(
    recipient_email: str,
    patient_name: str,
    doctor_name: str,
    appointment_time: str,
    is_telehealth: bool,
    meet_link: str = None,
    hospital_address: str = None
):
    subject = "Reminder: Your Appointment is Tomorrow"
    preheader = f"A friendly reminder about your upcoming appointment with {doctor_name}."
    
    location_details = ""
    if is_telehealth:
        location_details = f"""
            <p>This is a <strong>telehealth appointment</strong>. Please use the button below to join the video call at your scheduled time.</p>
            <a href="{meet_link}" class="button" target="_blank">Join Google Meet</a>
        """
    else:
        location_details = f"""
            <p>This is an <strong>in-person appointment</strong>.</p>
            <div class="info-box">
                <p><strong>Location:</strong><br>{hospital_address}</p>
            </div>
        """

    content_html = f"""
        <h1>Appointment Reminder</h1>
        <p>Hello {patient_name},</p>
        <p>This is a friendly reminder for your appointment with <strong>{doctor_name}</strong> scheduled for tomorrow, <strong>{appointment_time}</strong>.</p>
        {location_details}
        <p>If you need to cancel or reschedule, please contact our office as soon as possible.</p>
    """
    html_body = create_html_template(subject, preheader, content_html)
    _send_email(recipient_email, subject, html_body)


def send_billing_reminder_email(
    recipient_email: str,
    patient_name: str,
    bills: list,
    total_outstanding: float,
    overdue_count: int = 0
):
    """
    Send a billing reminder email to a patient with details of their pending bills.
    
    Args:
        recipient_email: Patient's email address
        patient_name: Patient's full name
        bills: List of bill dictionaries with details
        total_outstanding: Total amount owed across all bills
        overdue_count: Number of overdue bills
    """
    subject = "Payment Reminder - Outstanding Bills"
    preheader = f"You have {len(bills)} pending bill(s) with a total of ${total_outstanding:.2f} due."
    
    # Build bills table
    bills_html = ""
    for bill in bills:
        status_color = "#dc3545" if bill.get('is_overdue') else "#ffc107"
        status_text = "OVERDUE" if bill.get('is_overdue') else bill.get('status', 'pending').upper()
        
        bills_html += f"""
        <div class="info-box" style="margin-bottom: 15px; border-left-color: {status_color};">
            <p style="margin: 0 0 8px;"><strong>Bill #{bill.get('bill_number')}</strong></p>
            <p style="margin: 0 0 5px;">Amount: <strong>${bill.get('amount', 0):.2f}</strong></p>
            <p style="margin: 0 0 5px;">Due Date: {bill.get('due_date')}</p>
            <p style="margin: 0 0 5px;">Status: <span style="color: {status_color}; font-weight: bold;">{status_text}</span></p>
            {f'<p style="margin: 0; font-size: 12px; color: #666;">Services: {bill.get("services_summary", "Medical consultation")}</p>' if bill.get('services_summary') else ''}
        </div>
        """
    
    # Warning message for overdue bills
    overdue_warning = ""
    if overdue_count > 0:
        overdue_warning = f"""
        <div style="background-color: #fff3cd; border-left: 5px solid #dc3545; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Attention:</strong> You have {overdue_count} overdue bill(s). Please make payment as soon as possible to avoid late fees.</p>
        </div>
        """
    
    content_html = f"""
        <h1>Payment Reminder</h1>
        <p>Hello {patient_name},</p>
        <p>This is a friendly reminder that you have <strong>{len(bills)} pending bill(s)</strong> with a total outstanding balance of <strong>${total_outstanding:.2f}</strong>.</p>
        
        {overdue_warning}
        
        <h2 style="color: #333333; font-size: 18px; margin-top: 25px;">Bill Details:</h2>
        {bills_html}
        
        <div style="background-color: #e8f5e9; border-left: 5px solid {ACCENT_COLOR}; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Total Outstanding:</strong> ${total_outstanding:.2f}</p>
            <p style="margin: 0;">You can view and pay your bills online through your patient portal.</p>
        </div>
        
        <p style="margin-top: 25px;">
            <a href="#" class="button">View & Pay Bills</a>
        </p>
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If you have any questions about your bills or need to set up a payment plan, please contact our billing department.
        </p>
        
        <p style="margin-top: 15px; font-size: 14px; color: #666;">
            Thank you for choosing Nexgen for your healthcare needs.
        </p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    return _send_email(recipient_email, subject, html_body)

def send_appointment_swap_email(
    recipient_email: str,
    patient_name: str,
    doctor_name: str,
    old_time: str,
    new_time: str,
    is_telehealth: bool,
    meet_link: str = None,
    hospital_address: str = None
):
    """
    Send email notification when appointment time is swapped with another patient.
    """
    subject = "⚠️ Your Appointment Time Has Changed"
    preheader = f"Your appointment with {doctor_name} has been rescheduled"
    
    location_info = ""
    if is_telehealth and meet_link:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>📹 Telehealth Appointment</strong></p>
            <a href="{meet_link}" class="button">Join Video Call</a>
        </div>
        """
    elif hospital_address:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>📍 Location:</strong></p>
            <p style="margin: 0; color: #666;">{hospital_address}</p>
        </div>
        """
    
    content_html = f"""
    <h1>Appointment Time Changed</h1>
    <p>Dear {patient_name},</p>
    <p>Your appointment with <strong>{doctor_name}</strong> has been rescheduled due to schedule adjustments.</p>
    
    <div class="info-box">
        <p style="margin: 0 0 10px;"><strong>❌ Previous Time:</strong></p>
        <p style="margin: 0 0 20px; color: #999; text-decoration: line-through;">{old_time}</p>
        
        <p style="margin: 0 0 10px;"><strong>✅ New Time:</strong></p>
        <p style="margin: 0; color: {ACCENT_COLOR}; font-size: 18px; font-weight: bold;">{new_time}</p>
    </div>
    
    {location_info}
    
    <p style="margin-top: 20px;">If you have any questions or concerns about this change, please contact our office.</p>
    <p>We apologize for any inconvenience and look forward to seeing you at your new appointment time.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>{doctor_name}</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Appointment swap email sent to {recipient_email}")
    except Exception as e:
        print(f"❌ Failed to send swap email to {recipient_email}: {e}")


def send_appointment_cancellation_email(
    recipient_email: str,
    patient_name: str,
    doctor_name: str,
    appointment_time: str,
    is_telehealth: bool,
    cancelled_by: str,
    cancellation_reason: str = None,
    hospital_address: str = None
):
    """
    Send email notification when an appointment is cancelled.
    
    Args:
        recipient_email: Patient's email address
        patient_name: Patient's full name
        doctor_name: Doctor's full name
        appointment_time: Original appointment time (formatted string)
        is_telehealth: Boolean indicating if it was a video call
        cancelled_by: Role of person who cancelled (Doctor, Patient, etc.)
        cancellation_reason: Optional reason for cancellation
        hospital_address: Hospital location (if in-person)
    """
    subject = "❌ Appointment Cancelled"
    preheader = f"Your appointment with {doctor_name} has been cancelled"
    
    # Determine who cancelled
    cancelled_by_text = ""
    if cancelled_by == "Doctor":
        cancelled_by_text = f"<strong>{doctor_name}</strong> has cancelled this appointment"
    elif cancelled_by == "Patient":
        cancelled_by_text = "You have cancelled this appointment"
    else:
        cancelled_by_text = "This appointment has been cancelled"
    
    # Add cancellation reason if provided
    reason_section = ""
    if cancellation_reason:
        reason_section = f"""
        <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>Reason:</strong></p>
            <p style="margin: 0; color: #856404;">{cancellation_reason}</p>
        </div>
        """
    
    # Appointment type info
    appointment_type = ""
    if is_telehealth:
        appointment_type = "📹 Telehealth Appointment"
    else:
        appointment_type = f"📍 In-Person Appointment{f' at {hospital_address}' if hospital_address else ''}"
    
    content_html = f"""
    <h1>Appointment Cancelled</h1>
    <p>Dear {patient_name},</p>
    <p>{cancelled_by_text}.</p>
    
    <div class="info-box" style="border-left-color: #dc3545;">
        <p style="margin: 0 0 10px;"><strong>❌ Cancelled Appointment:</strong></p>
        <p style="margin: 0 0 10px; font-size: 18px; font-weight: bold; color: #dc3545;">{appointment_time}</p>
        <p style="margin: 0 0 5px;"><strong>Doctor:</strong> {doctor_name}</p>
        <p style="margin: 0;"><strong>Type:</strong> {appointment_type}</p>
    </div>
    
    {reason_section}
    
    <div style="background-color: #e8f5e9; border-left: 5px solid {ACCENT_COLOR}; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px;"><strong>Need to Reschedule?</strong></p>
        <p style="margin: 0;">Please contact our office or use the patient portal to book a new appointment.</p>
    </div>
    
    <p style="margin-top: 20px;">If you have any questions or concerns, please don't hesitate to contact our office.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>{doctor_name}</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Appointment cancellation email sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send cancellation email to {recipient_email}: {e}")
        return False


def send_doctor_reassignment_email_to_patient(
    recipient_email: str,
    patient_name: str,
    old_doctor_name: str,
    new_doctor_name: str,
    appointment_time: str,
    is_telehealth: bool,
    meet_link: str = None,
    hospital_address: str = None,
    reason: str = None
):
    """
    Send email to patient when their appointment doctor is reassigned.
    """
    subject = "🔄 Your Appointment Doctor Has Changed"
    preheader = f"Your appointment has been reassigned to {new_doctor_name}"
    
    reason_section = ""
    if reason:
        reason_section = f"""
        <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>Reason for Change:</strong></p>
            <p style="margin: 0; color: #856404;">{reason}</p>
        </div>
        """
    
    location_info = ""
    if is_telehealth and meet_link:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>📹 Telehealth Appointment</strong></p>
            <p style="margin: 0 0 10px;">A new video call link has been generated for your appointment.</p>
            <a href="{meet_link}" class="button">Join Video Call</a>
        </div>
        """
    elif hospital_address:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>📍 Location:</strong></p>
            <p style="margin: 0; color: #666;">{hospital_address}</p>
        </div>
        """
    
    content_html = f"""
    <h1>Doctor Reassignment Notice</h1>
    <p>Dear {patient_name},</p>
    <p>We wanted to inform you that your appointment has been reassigned to a different doctor.</p>
    
    <div class="info-box">
        <p style="margin: 0 0 10px;"><strong>Appointment Time:</strong></p>
        <p style="margin: 0 0 20px; font-size: 18px; font-weight: bold; color: {ACCENT_COLOR};">{appointment_time}</p>
        
        <p style="margin: 0 0 5px;"><strong>Previous Doctor:</strong></p>
        <p style="margin: 0 0 15px; color: #999;">{old_doctor_name}</p>
        
        <p style="margin: 0 0 5px;"><strong>New Doctor:</strong></p>
        <p style="margin: 0; color: {ACCENT_COLOR}; font-size: 16px; font-weight: bold;">{new_doctor_name}</p>
    </div>
    
    {reason_section}
    {location_info}
    
    <p style="margin-top: 20px;">Your appointment time and location remain the same. Only the attending doctor has changed.</p>
    <p>If you have any questions or concerns about this change, please contact our office.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>Nexgen Healthcare Team</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Doctor reassignment email sent to patient: {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send reassignment email to patient {recipient_email}: {e}")
        return False


def send_doctor_reassignment_email_to_old_doctor(
    recipient_email: str,
    doctor_name: str,
    patient_name: str,
    new_doctor_name: str,
    appointment_time: str,
    reason: str = None
):
    """
    Send email to the previous doctor when their appointment is reassigned.
    """
    subject = "📋 Appointment Reassigned"
    preheader = f"Your appointment with {patient_name} has been reassigned"
    
    reason_section = ""
    if reason:
        reason_section = f"""
        <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>Reason:</strong></p>
            <p style="margin: 0; color: #856404;">{reason}</p>
        </div>
        """
    
    content_html = f"""
    <h1>Appointment Reassigned</h1>
    <p>Dear {doctor_name},</p>
    <p>This is to inform you that one of your scheduled appointments has been reassigned to another doctor.</p>
    
    <div class="info-box" style="border-left-color: #ffc107;">
        <p style="margin: 0 0 10px;"><strong>Patient:</strong> {patient_name}</p>
        <p style="margin: 0 0 10px;"><strong>Original Time:</strong> {appointment_time}</p>
        <p style="margin: 0;"><strong>Reassigned To:</strong> {new_doctor_name}</p>
    </div>
    
    {reason_section}
    
    <p style="margin-top: 20px;">This appointment has been removed from your schedule. No further action is required from you.</p>
    <p>If you have any questions about this change, please contact the hospital administration.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>Hospital Administration</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Reassignment notification sent to old doctor: {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send notification to old doctor {recipient_email}: {e}")
        return False


def send_doctor_reassignment_email_to_new_doctor(
    recipient_email: str,
    doctor_name: str,
    patient_name: str,
    old_doctor_name: str,
    appointment_time: str,
    is_telehealth: bool,
    meet_link: str = None,
    hospital_address: str = None,
    reason_for_visit: str = None
):
    """
    Send email to the new doctor when an appointment is reassigned to them.
    """
    subject = "📋 New Appointment Assigned to You"
    preheader = f"An appointment with {patient_name} has been assigned to you"
    
    location_info = ""
    if is_telehealth and meet_link:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>📹 Telehealth Appointment</strong></p>
            <p style="margin: 0 0 10px;">A new video call link has been generated for this appointment.</p>
            <a href="{meet_link}" class="button">Join Video Call</a>
        </div>
        """
    elif hospital_address:
        location_info = f"""
        <div style="margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>📍 Location:</strong></p>
            <p style="margin: 0; color: #666;">{hospital_address}</p>
        </div>
        """
    
    reason_section = ""
    if reason_for_visit:
        reason_section = f"""
        <div style="background-color: #e8f5e9; border-left: 5px solid {ACCENT_COLOR}; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px;"><strong>Reason for Visit:</strong></p>
            <p style="margin: 0;">{reason_for_visit}</p>
        </div>
        """
    
    content_html = f"""
    <h1>New Appointment Assigned</h1>
    <p>Dear {doctor_name},</p>
    <p>An appointment has been reassigned to you by the hospital administration.</p>
    
    <div class="info-box">
        <p style="margin: 0 0 10px;"><strong>Patient:</strong> {patient_name}</p>
        <p style="margin: 0 0 10px;"><strong>Appointment Time:</strong></p>
        <p style="margin: 0 0 15px; font-size: 18px; font-weight: bold; color: {ACCENT_COLOR};">{appointment_time}</p>
        <p style="margin: 0 0 5px;"><strong>Previously Assigned To:</strong></p>
        <p style="margin: 0; color: #666;">{old_doctor_name}</p>
    </div>
    
    {reason_section}
    {location_info}
    
    <p style="margin-top: 20px;">This appointment has been added to your schedule. Please review the patient's information before the appointment.</p>
    <p>If you have any questions or concerns, please contact the hospital administration.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>Hospital Administration</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ New appointment notification sent to doctor: {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send notification to new doctor {recipient_email}: {e}")
        return False


def send_waitlist_invitation_email(
    recipient_email: str,
    patient_name: str,
    doctor_name: str,
    appointment_time: str,
    booking_url: str,
    expiry_time: str,
    is_telehealth: bool,
    hospital_address: str = None
):
    """
    Send waitlist invitation email to patient with booking link.
    
    Args:
        recipient_email: Patient's email address
        patient_name: Patient's full name
        doctor_name: Doctor's full name
        appointment_time: Formatted appointment date and time
        booking_url: URL with booking token for patient to claim slot
        expiry_time: Formatted expiry time for the invitation
        is_telehealth: Boolean indicating if it's a video call
        hospital_address: Hospital location (if in-person)
    """
    subject = "🎉 Appointment Available - Claim Your Spot!"
    preheader = f"An appointment with {doctor_name} is now available"
    
    # Appointment type info
    appointment_type = ""
    if is_telehealth:
        appointment_type = "📹 Telehealth Appointment (Video Call)"
    else:
        appointment_type = f"📍 In-Person Appointment{f' at {hospital_address}' if hospital_address else ''}"
    
    content_html = f"""
    <h1>Great News! An Appointment is Available</h1>
    <p>Dear {patient_name},</p>
    <p>Good news! An appointment slot with <strong>{doctor_name}</strong> has become available and you're on the waitlist.</p>
    
    <div class="info-box">
        <p style="margin: 0 0 10px;"><strong>📅 Available Appointment:</strong></p>
        <p style="margin: 0 0 15px; font-size: 18px; font-weight: bold; color: {ACCENT_COLOR};">{appointment_time}</p>
        <p style="margin: 0 0 5px;"><strong>Doctor:</strong> {doctor_name}</p>
        <p style="margin: 0;"><strong>Type:</strong> {appointment_type}</p>
    </div>
    
    <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 5px;"><strong>⏰ Act Fast!</strong></p>
        <p style="margin: 0; color: #856404;">This invitation expires on <strong>{expiry_time}</strong>. Click the button below to claim your appointment before it's offered to someone else.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{booking_url}" class="button" style="font-size: 16px; padding: 15px 30px;">Claim Appointment Now</a>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #666;">
        If you can no longer make this appointment, simply ignore this email and the slot will be offered to the next person on the waitlist.
    </p>
    
    <p style="margin-top: 15px; font-size: 14px; color: #666;">
        If you have any questions, please contact our office.
    </p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>{doctor_name}</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Waitlist invitation email sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send waitlist invitation email to {recipient_email}: {e}")
        return False


def send_waitlist_expiry_notification_email(
    recipient_email: str,
    patient_name: str,
    doctor_name: str
):
    """
    Send email notification when a waitlist entry has expired.
    
    Args:
        recipient_email: Patient's email address
        patient_name: Patient's full name
        doctor_name: Doctor's full name
    """
    subject = "Waitlist Entry Expired"
    preheader = f"Your waitlist entry for {doctor_name} has expired"
    
    content_html = f"""
    <h1>Waitlist Entry Expired</h1>
    <p>Dear {patient_name},</p>
    <p>We wanted to let you know that your waitlist entry for appointments with <strong>{doctor_name}</strong> has expired.</p>
    
    <div class="info-box" style="border-left-color: #ffc107;">
        <p style="margin: 0 0 10px;"><strong>What This Means:</strong></p>
        <p style="margin: 0;">Your entry has been removed from the waitlist and you will no longer receive notifications about available appointment slots.</p>
    </div>
    
    <div style="background-color: #e8f5e9; border-left: 5px solid {ACCENT_COLOR}; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px;"><strong>Still Need an Appointment?</strong></p>
        <p style="margin: 0;">If you would still like to see {doctor_name}, please contact our office to:</p>
        <ul style="margin: 10px 0 0 20px; padding: 0;">
            <li>Book a regular appointment</li>
            <li>Be added back to the waitlist</li>
            <li>Discuss other available options</li>
        </ul>
    </div>
    
    <p style="margin-top: 20px;">We're here to help you get the care you need. Please don't hesitate to reach out to our office.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>Nexgen Healthcare Team</strong></p>
    """
    
    html_body = create_html_template(subject, preheader, content_html)
    
    try:
        _send_email(recipient_email, subject, html_body)
        print(f"✅ Waitlist expiry notification sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send waitlist expiry notification to {recipient_email}: {e}")
        return False
