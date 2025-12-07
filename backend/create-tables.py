import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Step 1: Import your Base object and ALL of your models.
# This is the most crucial step. SQLAlchemy needs to "see" the model
# definitions to know what tables to create.

from db.db import Base
from models.permission_model import Permission
from models.role_model import Role, role_permissions
from models.tracker_column_model import TrackerColumn, role_tracker_column_association
from models.user_model import User
from models.hospital_model import Hospital
from models.department_model import Department
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.patient_profile_model import PatientProfile
# from models.medica import MedicalHistory, Vitals
from models.appointment_session_model import AppointmentSession
from models.appointment_model import Appointment
from models.availability_template_model import AvailabilityTemplate
from models.google_auth_token_model import GoogleAuthToken
# from models.conversation_model import Conversation, ConversationParticipant, Message


def create_all_tables():
    """
    Connects to the database defined in the .env file and creates all
    tables based on the imported SQLAlchemy models.
    """
    # Load environment variables from .env file
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("🔴 ERROR: DATABASE_URL environment variable not found in .env file.")
        return

    print("✅ Database URL loaded.")
    
    try:
        # Create a SQLAlchemy engine
        engine = create_engine(database_url)

        print("⏳ Creating all tables...")
        
        # Create all tables defined by the models imported above
        Base.metadata.create_all(bind=engine)
        
        print("✅ All tables created successfully!")

    except Exception as e:
        print(f"🔴 An error occurred while creating tables: {e}")


if __name__ == "__main__":
    create_all_tables()