from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime
from utils.socket import sio

from models.user_model import User
from models.messaging_model import Conversation, ConversationParticipant, Message
from models.doctor_profile_model import DoctorProfile
from models.staff_profile_model import StaffProfile

# --- Helper function to determine hospital_id ---
def _get_user_hospital_id(user: User) -> Optional[int]:
    """Determines the hospital ID for a user based on their role and profile."""
    role_name = user.role.name
    print(f"DEBUG: Getting hospital ID for user {user.email} with role {role_name}")
    
    if role_name == "Doctor":
        if user.doctor_profile and user.doctor_profile.department:
            print(f"DEBUG: Doctor found. Department ID: {user.doctor_profile.department.hospital_id}")
            return user.doctor_profile.department.hospital_id
    elif role_name in ["Hospital_Admin", "Receptionist"]:
        # StaffProfile model directly contains hospital_id
        if user.staff_profile:
            print(f"DEBUG: Staff/Admin found. Hospital ID: {user.staff_profile.hospital_id}")
            return user.staff_profile.hospital_id
            
    print(f"DEBUG: Could not determine hospital for role: {role_name}")
    return None

# --- Pydantic Schemas ---

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str  # Added sender's full name for clarity
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ParticipantResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    role: str
    profile_picture_url: Optional[str] = None # Added profile picture URL field

class ConversationResponse(BaseModel):
    id: int
    subject: Optional[str] = None
    hospital_id: int
    participants: List[ParticipantResponse]
    last_message: Optional[MessageResponse] = None

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: int
    subject: Optional[str] = None
    current_user_id: int  # Added to easily identify the current user on the frontend
    participants: List[ParticipantResponse]
    messages: List[MessageResponse]

    class Config:
        from_attributes = True

# --- New, simplified schema for the inbox view ---
class ConversationInboxResponse(BaseModel):
    conversation_id: int
    subject: Optional[str] = None
    receiver_id: int
    receiver_name: str
    last_message_preview: Optional[str] = None
    last_message_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True

class CreateConversationRequest(BaseModel):
    subject: Optional[str] = None
    recipient_user_ids: List[int]

class CreateMessageRequest(BaseModel):
    content: str

# --- Service Functions ---

def create_conversation(
    db: Session,
    request: CreateConversationRequest,
    current_user: User
):
    # Eagerly load necessary relationships for the current user
    user_with_profiles = db.query(User).options(
        joinedload(User.role),
        joinedload(User.doctor_profile).joinedload(DoctorProfile.department),
        joinedload(User.staff_profile)
    ).filter(User.id == current_user.id).one()

    hospital_id = _get_user_hospital_id(user_with_profiles)
    if not hospital_id:
        raise HTTPException(status_code=403, detail=f"Could not determine hospital association for user role: {user_with_profiles.role.name}")

    # Check recipients
    recipients = db.query(User).options(
        joinedload(User.role),
        joinedload(User.doctor_profile).joinedload(DoctorProfile.department),
        joinedload(User.staff_profile)
    ).filter(User.id.in_(request.recipient_user_ids)).all()

    if len(recipients) != len(request.recipient_user_ids):
        raise HTTPException(status_code=404, detail="One or more recipients not found.")

    for r in recipients:
        if _get_user_hospital_id(r) != hospital_id:
            raise HTTPException(status_code=403, detail=f"Recipient {r.email} does not belong to your hospital.")

    # Create the conversation
    new_conversation = Conversation(
        subject=request.subject,
        hospital_id=hospital_id
    )
    db.add(new_conversation)
    db.flush()

    # Add all participants
    all_participant_ids = set(request.recipient_user_ids + [current_user.id])
    participants = [
        ConversationParticipant(conversation_id=new_conversation.id, user_id=user_id)
        for user_id in all_participant_ids
    ]
    db.add_all(participants)
    db.commit()
    db.refresh(new_conversation)

    return new_conversation

def get_conversations_for_user(db: Session, current_user: User) -> List[ConversationInboxResponse]:
    # Find all conversation IDs the user is a part of
    participant_records = db.query(ConversationParticipant).filter(ConversationParticipant.user_id == current_user.id).all()
    conversation_ids = [p.conversation_id for p in participant_records]

    if not conversation_ids:
        return []

    # Fetch conversations with participants and their latest message
    conversations = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user).joinedload(User.role),
        joinedload(Conversation.messages)
    ).filter(Conversation.id.in_(conversation_ids)).all()
    
    # Sort conversations by the timestamp of their last message, descending
    conversations.sort(key=lambda c: c.messages[-1].created_at if c.messages else c.created_at, reverse=True)

    # Format the response into the new simplified model
    response = []
    for conv in conversations:
        # Find the other participant (the receiver)
        # In a group chat, this logic will pick the first other participant.
        # For a more robust group chat name, you would concatenate names.
        receiver_participant = next((p for p in conv.participants if p.user_id != current_user.id), None)
        
        # If the current user is the only one in the chat, don't show it.
        if not receiver_participant:
            continue

        last_msg = conv.messages[-1] if conv.messages else None
        
        response.append(ConversationInboxResponse(
            conversation_id=conv.id,
            subject=conv.subject,
            receiver_id=receiver_participant.user.id,
            receiver_name=f"{receiver_participant.user.first_name} {receiver_participant.user.last_name}",
            last_message_preview=last_msg.content[:50] + '...' if last_msg and last_msg.content else "No messages yet",
            last_message_timestamp=last_msg.created_at if last_msg else None,
        ))
    return response


from utils.socket import sio  # Make sure this is imported


async def create_message(
    db: Session,
    conversation_id: int,
    request: CreateMessageRequest,
    current_user: User
) -> MessageResponse:
    print(f"🟡 create_message called by user {current_user.id} ({current_user.email})")

    # Authorization Check
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant:
        print(f"🔴 User {current_user.id} is not a participant of conversation {conversation_id}")
        raise HTTPException(status_code=403, detail="You are not a participant of this conversation.")

    user_hospital_id = _get_user_hospital_id(current_user)
    print(f"🏥 User hospital ID: {user_hospital_id}")

    if not user_hospital_id or participant.conversation.hospital_id != user_hospital_id:
        print(f"🔴 Hospital mismatch: conversation hospital ID = {participant.conversation.hospital_id}")
        raise HTTPException(status_code=403, detail="Conversation does not belong to your hospital.")

    # Create and save the new message
    new_message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=request.content
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    print(f"✅ Message created: ID={new_message.id}, Sender={new_message.sender_id}, Content='{new_message.content}'")

    # Construct response
    response = MessageResponse(
        id=new_message.id,
        sender_id=new_message.sender_id,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        content=new_message.content,
        created_at=new_message.created_at
    )

    payload = {
        **json.loads(response.json()),
        "conversation_id": conversation_id
    }

    print(f"📦 Payload prepared for emit: {payload}")

    # Emit to all participants
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()

    print(f"👥 Found {len(participants)} participants in conversation {conversation_id}")

    for p in participants:
        room_name = f"user_{p.user_id}"
        print(f"📤 Emitting to room: {room_name}")
        await sio.emit("new_message", payload, room=room_name)

    print(f"✅ Message broadcast complete for conversation {conversation_id}")
    return response

# async def create_message( 
#     db: Session, 
#     conversation_id: int, 
#     request: CreateMessageRequest, 
#     current_user: User 
# ) -> MessageResponse: 
#     # ... (Your existing authorization and message creation logic is fine) ...
#     # Authorization Check
#     participant = db.query(ConversationParticipant).filter(
#         ConversationParticipant.conversation_id == conversation_id,
#         ConversationParticipant.user_id == current_user.id
#     ).first()

#     if not participant:
#         raise HTTPException(status_code=403, detail="You are not a participant of this conversation.")

#     user_hospital_id = _get_user_hospital_id(current_user)
#     if not user_hospital_id or participant.conversation.hospital_id != user_hospital_id:
#         raise HTTPException(status_code=403, detail="Conversation does not belong to your hospital.")

#     # Create and save the new message
#     new_message = Message(
#         conversation_id=conversation_id,
#         sender_id=current_user.id,
#         content=request.content
#     )
#     db.add(new_message)
#     db.commit()
#     db.refresh(new_message)

#     # Construct response
#     response = MessageResponse(
#         id=new_message.id,
#         sender_id=new_message.sender_id,
#         sender_name=f"{current_user.first_name} {current_user.last_name}",
#         content=new_message.content,
#         created_at=new_message.created_at
#     )

#     # 👇 FIX: Convert the Pydantic model to a JSON-serializable dictionary
#     # The .json() method correctly handles the datetime object, converting it to an ISO string.
#     # Then json.loads() converts the JSON string back into a Python dictionary.
#     payload = {
#     **json.loads(response.json()),
#     "conversation_id": conversation_id
# }


    # ✅ Emit to all participants in the conversation
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()

    for p in participants:
        room_name = f"user_{p.user_id}"
        # Use the serialized payload instead of response.dict()
        await sio.emit("new_message", payload, room=room_name)

    return response

def get_messages_for_conversation(db: Session, conversation_id: int, current_user: User):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=403, detail="You are not authorized to view this conversation.")

    # Update the query to also eager load the doctor and staff profiles for each user
    conversation = db.query(Conversation).options(
        joinedload(Conversation.messages).joinedload(Message.sender),
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user).options(
            joinedload(User.role),
            joinedload(User.doctor_profile),
            joinedload(User.staff_profile) 
        )
    ).filter(Conversation.id == conversation_id).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    sorted_messages = sorted(conversation.messages, key=lambda msg: msg.created_at)

    message_responses = [
        MessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=f"{msg.sender.first_name} {msg.sender.last_name}",
            content=msg.content,
            created_at=msg.created_at
        ) for msg in sorted_messages
    ]

    # Helper function to get profile picture URL based on role
    def get_profile_picture(user: User) -> Optional[str]:
        if user.role.name == "Doctor" and user.doctor_profile:
            return user.doctor_profile.profile_picture_url
        if user.role.name in ["Hospital_Admin", "Receptionist"] and user.staff_profile:
            return user.staff_profile.profile_picture_url
        return None

    return ConversationDetailResponse(
        id=conversation.id,
        subject=conversation.subject,
        current_user_id=current_user.id,
        participants=[
            ParticipantResponse(
                user_id=p.user.id,
                first_name=p.user.first_name,
                last_name=p.user.last_name,
                role=p.user.role.name,
                profile_picture_url=get_profile_picture(p.user) # Populate the new field
            ) for p in conversation.participants
        ],
        messages=message_responses
    )
