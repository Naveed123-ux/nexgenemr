from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime
from utils.socket import sio

from models.user_model import User
from models.messaging_model import Conversation, ConversationParticipant, Message
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile
from models.patient_profile_model import PatientProfile
from models.appointment_model import Appointment
from models.user_block_model import UserBlock

# --- Helper function to determine hospital_id ---
def _get_user_hospital_id(user: User, db: Session) -> Optional[int]:
    """Determines the hospital ID for a user based on their role and profile."""
    role_name = user.role.name
    
    if role_name == "Doctor":
        doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if doctor_profile and doctor_profile.department:
            return doctor_profile.department.hospital_id
    elif role_name in ["Hospital_Admin", "Receptionist", "Staff", "Lab_Technician"]:
        staff_profile = db.query(StaffProfile).filter(StaffProfile.user_id == user.id).first()
        if staff_profile:
            return staff_profile.hospital_id
    elif role_name == "Patient":
        patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        if patient_profile:
            return patient_profile.hospital_id
            
    return None

# --- Pydantic Schemas ---

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ParticipantResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    role: str
    profile_picture_url: Optional[str] = None

class ConversationInboxResponse(BaseModel):
    conversation_id: int
    subject: Optional[str] = None
    receiver_id: int
    receiver_name: str
    receiver_role: str
    last_message_preview: Optional[str] = None
    last_message_timestamp: Optional[datetime] = None
    unread_count: int

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: int
    subject: Optional[str] = None
    current_user_id: int
    participants: List[ParticipantResponse]
    messages: List[MessageResponse]

    class Config:
        from_attributes = True

class CreateConversationRequest(BaseModel):
    subject: Optional[str] = None
    recipient_user_id: int # Changed to single recipient for 1-on-1 logic simplify

class CreateMessageRequest(BaseModel):
    content: str

class ContactResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    role: str
    profile_picture_url: Optional[str] = None
    is_blocked: bool = False

# --- Service Functions ---

def get_allowed_contacts(db: Session, current_user: User) -> List[ContactResponse]:
    role_name = current_user.role.name
    hospital_id = _get_user_hospital_id(current_user, db)
    
    contacts = []
    
    # 1. Super_Admin: can talk to ALL Hospital Admins
    if role_name == "Super_Admin":
        admins = db.query(User).options(joinedload(User.role)).join(User.role).filter(
            User.role.has(name="Hospital_Admin"),
            User.id != current_user.id
        ).all()
        contacts = admins
    
    # 2. Hospital_Admin: Super_Admin + all staff/doctors in their hospital
    elif role_name == "Hospital_Admin":
        super_admins = db.query(User).options(joinedload(User.role)).join(User.role).filter(
            User.role.has(name="Super_Admin")
        ).all()
        staff = db.query(User).options(joinedload(User.role)).join(StaffProfile, User.id == StaffProfile.user_id).filter(
            StaffProfile.hospital_id == hospital_id,
            User.id != current_user.id
        ).all()
        doctors = db.query(User).options(joinedload(User.role)).join(DoctorProfile, User.id == DoctorProfile.user_id).filter(
            DoctorProfile.department.has(hospital_id=hospital_id)
        ).all()
        contacts = list({u.id: u for u in super_admins + staff + doctors}.values())

    # 3. All Staff roles: Hospital_Admin + colleagues + patients in hospital
    elif role_name in ["Receptionist", "Staff", "Lab_Technician", "Doctor"]:
        admins = db.query(User).options(joinedload(User.role)).join(User.role).filter(
            User.role.has(name="Hospital_Admin")
        ).join(StaffProfile, User.id == StaffProfile.user_id).filter(
            StaffProfile.hospital_id == hospital_id
        ).all()
        staff = db.query(User).options(joinedload(User.role)).join(StaffProfile, User.id == StaffProfile.user_id).filter(
            StaffProfile.hospital_id == hospital_id,
            User.id != current_user.id
        ).all()
        doctors = db.query(User).options(joinedload(User.role)).join(DoctorProfile, User.id == DoctorProfile.user_id).filter(
            DoctorProfile.department.has(hospital_id=hospital_id),
            User.id != current_user.id
        ).all()
        patients = db.query(User).options(joinedload(User.role)).join(PatientProfile, User.id == PatientProfile.user_id).filter(
            PatientProfile.hospital_id == hospital_id
        ).all()
        contacts = list({u.id: u for u in admins + staff + doctors + patients}.values())

    # 4. Patient: all staff/doctors at their registered hospital
    elif role_name == "Patient":
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == current_user.id
        ).first()
        if patient_profile:
            patient_hospital_id = patient_profile.hospital_id
            doctors = db.query(User).options(joinedload(User.role)).join(DoctorProfile, User.id == DoctorProfile.user_id).filter(
                DoctorProfile.department.has(hospital_id=patient_hospital_id)
            ).all()
            staff = db.query(User).options(joinedload(User.role)).join(StaffProfile, User.id == StaffProfile.user_id).filter(
                StaffProfile.hospital_id == patient_hospital_id
            ).all()
            contacts = list({u.id: u for u in doctors + staff}.values())

    blocked_ids = {b.blocked_id for b in db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user.id
    ).all()}

    return [
        ContactResponse(
            user_id=u.id,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role.name if u.role else "Unknown",
            profile_picture_url=None,
            is_blocked=u.id in blocked_ids
        )
        for u in contacts if u and u.id != current_user.id
    ]

async def create_conversation(db: Session, request: CreateConversationRequest, current_user: User):
    recipient_id = request.recipient_user_id
    
    # 1. Check if recipient exists
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    # 2. Check if contact is allowed
    allowed_contacts = get_allowed_contacts(db, current_user)
    if not any(c.user_id == recipient_id for c in allowed_contacts):
        raise HTTPException(status_code=403, detail="You are not authorized to message this user.")

    # 3. Check if blocked
    # Is the sender blocked by recipient?
    block = db.query(UserBlock).filter(UserBlock.blocker_id == recipient_id, UserBlock.blocked_id == current_user.id).first()
    if block:
        raise HTTPException(status_code=403, detail="You are blocked by this user.")

    # 4. Check for existing 1-on-1 conversation
    existing_conv = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id
    ).filter(
        Conversation.id.in_(db.query(ConversationParticipant.conversation_id).filter(ConversationParticipant.user_id == recipient_id))
    ).first()

    if existing_conv:
        return existing_conv

    hospital_id = _get_user_hospital_id(current_user, db) or _get_user_hospital_id(recipient, db)
    if not hospital_id and not (current_user.role.name == "Super_Admin" or recipient.role.name == "Super_Admin"):
         raise HTTPException(status_code=400, detail="Could not determine hospital for conversation.")

    new_conv = Conversation(subject=request.subject, hospital_id=hospital_id or 0)
    db.add(new_conv)
    db.flush()

    db.add_all([
        ConversationParticipant(conversation_id=new_conv.id, user_id=current_user.id),
        ConversationParticipant(conversation_id=new_conv.id, user_id=recipient_id)
    ])
    db.commit()
    db.refresh(new_conv)
    return new_conv

def get_conversations_for_user(db: Session, current_user: User) -> List[ConversationInboxResponse]:
    participants = db.query(ConversationParticipant).filter(ConversationParticipant.user_id == current_user.id).all()
    conversation_ids = [p.conversation_id for p in participants]
    
    if not conversation_ids:
        return []

    conversations = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user).joinedload(User.role),
        joinedload(Conversation.messages)
    ).filter(Conversation.id.in_(conversation_ids)).all()

    # Sort by last message
    conversations.sort(key=lambda c: c.messages[-1].created_at if c.messages else c.created_at, reverse=True)

    response = []
    for conv in conversations:
        other_p = next((p for p in conv.participants if p.user_id != current_user.id), None)
        if not other_p: continue

        user_p = next((p for p in conv.participants if p.user_id == current_user.id), None)
        last_read = user_p.last_read_at if user_p else None
        
        unread_count = 0
        if last_read:
            unread_count = db.query(Message).filter(Message.conversation_id == conv.id, Message.created_at > last_read).count()
        else:
            unread_count = len(conv.messages)

        last_msg = conv.messages[-1] if conv.messages else None
        
        response.append(ConversationInboxResponse(
            conversation_id=conv.id,
            subject=conv.subject,
            receiver_id=other_p.user.id,
            receiver_name=f"{other_p.user.first_name} {other_p.user.last_name}",
            receiver_role=other_p.user.role.name,
            last_message_preview=last_msg.content[:50] if last_msg else "No messages",
            last_message_timestamp=last_msg.created_at if last_msg else None,
            unread_count=unread_count
        ))
    return response

async def create_message(db: Session, conversation_id: int, request: CreateMessageRequest, current_user: User):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant.")

    # Check if ANY other participant has blocked the sender
    other_participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != current_user.id
    ).all()
    
    for other in other_participants:
        block = db.query(UserBlock).filter(UserBlock.blocker_id == other.user_id, UserBlock.blocked_id == current_user.id).first()
        if block:
            raise HTTPException(status_code=403, detail="You are blocked by a participant in this conversation.")

    new_msg = Message(conversation_id=conversation_id, sender_id=current_user.id, content=request.content)
    db.add(new_msg)
    
    # Auto-update sender's last_read_at
    participant.last_read_at = datetime.utcnow()
    
    db.commit()
    db.refresh(new_msg)

    response = MessageResponse(
        id=new_msg.id,
        sender_id=new_msg.sender_id,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        content=new_msg.content,
        created_at=new_msg.created_at
    )

    payload = {**json.loads(response.json()), "conversation_id": conversation_id}
    for p in other_participants:
        await sio.emit("new_message", payload, room=f"user_{p.user_id}")
    
    return response

def get_messages_for_conversation(db: Session, conversation_id: int, current_user: User):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    # Mark as read
    participant.last_read_at = datetime.utcnow()
    db.commit()

    conversation = db.query(Conversation).options(
        joinedload(Conversation.messages).joinedload(Message.sender),
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user).joinedload(User.role)
    ).filter(Conversation.id == conversation_id).first()

    return ConversationDetailResponse(
        id=conversation.id,
        subject=conversation.subject,
        current_user_id=current_user.id,
        participants=[
            ParticipantResponse(
                user_id=p.user.id,
                first_name=p.user.first_name,
                last_name=p.user.last_name,
                role=p.user.role.name
            ) for p in conversation.participants
        ],
        messages=[
            MessageResponse(
                id=m.id,
                sender_id=m.sender_id,
                sender_name=f"{m.sender.first_name} {m.sender.last_name}",
                content=m.content,
                created_at=m.created_at
            ) for m in sorted(conversation.messages, key=lambda x: x.created_at)
        ]
    )

def block_user(db: Session, current_user: User, user_id_to_block: int):
    # Rule check
    target_user = db.query(User).join(User.role).filter(User.id == user_id_to_block).first()
    if not target_user: raise HTTPException(status_code=404, detail="User not found.")
    
    my_role = current_user.role.name
    their_role = target_user.role.name
    
    # Hospital Admin cannot block Super Admin
    if my_role == "Hospital_Admin" and their_role == "Super_Admin":
        raise HTTPException(status_code=403, detail="You cannot block the Super Admin.")
    
    # Staff/Doctor/Lab/Receptionist cannot block Hospital Admin
    if my_role in ["Staff", "Doctor", "Receptionist", "Lab_Technician"] and their_role == "Hospital_Admin":
        raise HTTPException(status_code=403, detail="You cannot block the Hospital Admin.")
    
    # Patient cannot block Doctor or staff
    if my_role == "Patient":
        raise HTTPException(status_code=403, detail="Patients cannot block staff members.")

    existing = db.query(UserBlock).filter(UserBlock.blocker_id == current_user.id, UserBlock.blocked_id == user_id_to_block).first()
    if not existing:
        new_block = UserBlock(blocker_id=current_user.id, blocked_id=user_id_to_block)
        db.add(new_block)
        db.commit()
    return {"status": "blocked"}

def unblock_user(db: Session, current_user: User, user_id_to_unblock: int):
    block = db.query(UserBlock).filter(UserBlock.blocker_id == current_user.id, UserBlock.blocked_id == user_id_to_unblock).first()
    if block:
        db.delete(block)
        db.commit()
    return {"status": "unblocked"}
