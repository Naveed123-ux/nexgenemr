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



@router.post("/conversations", response_model=messaging_service.ConversationInboxResponse, dependencies=[Depends(require_permission("messaging:create"))])
def create_new_conversation(
    request: messaging_service.CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Starts a new conversation with one or more recipients.
    """
    conversation = messaging_service.create_conversation(db, request, current_user)
    # The response after creation can still be detailed, or you can simplify it.
    # For now, let's refetch the simplified list and return the newest one.
    # A more optimal way would be to format the `conversation` object directly.
    all_convos = messaging_service.get_conversations_for_user(db, current_user)
    return next((c for c in all_convos if c.conversation_id == conversation.id), None)


@router.get("/conversations", response_model=List[messaging_service.ConversationInboxResponse], dependencies=[Depends(require_permission("messaging:read"))])
def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all conversations for the currently logged-in user in a simplified format.
    """
    return messaging_service.get_conversations_for_user(db, current_user)

@router.get("/conversations/{conversation_id}", response_model=messaging_service.ConversationDetailResponse, dependencies=[Depends(require_permission("messaging:read"))])
def get_conversation_details(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all messages and details for a specific conversation.
    """
    return messaging_service.get_messages_for_conversation(db, conversation_id, current_user)


@router.post("/conversations/{conversation_id}/messages", response_model=messaging_service.MessageResponse, dependencies=[Depends(require_permission("messaging:create"))])
async def send_new_message(
    conversation_id: int,
    request: messaging_service.CreateMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await messaging_service.create_message(db, conversation_id, request, current_user)