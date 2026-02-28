from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user_model import User
from models.messaging_model import Conversation, ConversationParticipant, Message
from models.role_model import Role
from models.hospital_model import Hospital
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.patient_profile_model import PatientProfile
from services import messaging_service
from db.db import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def check_super_admin_state():
    # 1. Find Super Admin
    super_admin = db.query(User).join(Role).filter(Role.name == "Super_Admin").first()
    if not super_admin:
        print("No Super Admin found!")
        return

    print(f"Super Admin: {super_admin.first_name} {super_admin.last_name} (ID: {super_admin.id})")

    # 2. Find all Hospital Admins
    hospital_admins = db.query(User).join(Role).filter(Role.name == "Hospital_Admin").all()
    print(f"Total Hospital Admins: {len(hospital_admins)}")
    for admin in hospital_admins:
        print(f" - {admin.first_name} {admin.last_name} (ID: {admin.id})")

    # 3. Check Allowed Contacts via Service
    allowed = messaging_service.get_allowed_contacts(db, super_admin)
    print(f"Allowed Contacts (via service): {len(allowed)}")
    for c in allowed:
        print(f" - {c.first_name} {c.last_name} (ID: {c.user_id})")

    # 4. Check Conversations
    conversations = messaging_service.get_conversations_for_user(db, super_admin)
    print(f"Active Conversations: {len(conversations)}")
    conversed_ids = []
    for c in conversations:
        print(f" - Convo {c.conversation_id} with {c.receiver_name} (ID: {c.receiver_id})")
        conversed_ids.append(c.receiver_id)

    # 5. Calculate Expected New Contacts
    expected_new = [c for c in allowed if c.user_id not in conversed_ids]
    print(f"Expected New Contacts (Allowed - Conversed): {len(expected_new)}")
    for c in expected_new:
        print(f" - {c.first_name} {c.last_name} (ID: {c.user_id})")

if __name__ == "__main__":
    check_super_admin_state()
