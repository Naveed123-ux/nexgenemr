from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from db.db import get_db
from services import messaging_service
from utils.dependencies import get_current_user, require_permission
from models.user_model import User

router = APIRouter(
    prefix="/messaging",
    tags=["Messaging"]
)

@router.get("/contacts", response_model=List[messaging_service.ContactResponse])
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of users that the current user is allowed to message.
    """
    return messaging_service.get_allowed_contacts(db, current_user)

@router.post("/conversations", response_model=messaging_service.ConversationInboxResponse, dependencies=[Depends(require_permission("messaging:create"))])
def create_new_conversation(
    request: messaging_service.CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Starts a new 1-on-1 conversation with a recipient.
    """
    conversation = messaging_service.create_conversation(db, request, current_user)
    all_convos = messaging_service.get_conversations_for_user(db, current_user)
    return next((c for c in all_convos if c.conversation_id == conversation.id), None)

@router.get("/conversations", response_model=List[messaging_service.ConversationInboxResponse], dependencies=[Depends(require_permission("messaging:read"))])
def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all conversations for the currently logged-in user with unread counts.
    """
    return messaging_service.get_conversations_for_user(db, current_user)

@router.get("/conversations/{conversation_id}", response_model=messaging_service.ConversationDetailResponse, dependencies=[Depends(require_permission("messaging:read"))])
def get_conversation_details(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all messages and details for a specific conversation, marking it as read.
    """
    return messaging_service.get_messages_for_conversation(db, conversation_id, current_user)

@router.post("/conversations/{conversation_id}/messages", response_model=messaging_service.MessageResponse, dependencies=[Depends(require_permission("messaging:create"))])
async def send_new_message(
    conversation_id: int,
    request: messaging_service.CreateMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends a new message in a conversation, checking for blocks.
    """
    return await messaging_service.create_message(db, conversation_id, request, current_user)

@router.post("/block/{user_id}")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Block a user from messaging you.
    """
    return messaging_service.block_user(db, current_user, user_id)

@router.post("/unblock/{user_id}")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unblock a previously blocked user.
    """
    return messaging_service.unblock_user(db, current_user, user_id)