from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.db import get_db
from models.user_model import User
from models.google_auth_token_model import GoogleAuthToken
from utils.google_calendar_utils import get_authorization_url, exchange_code_for_tokens
from utils.jwt import create_access_token # We can use this to create the state token

class AuthUrlResponse(BaseModel):
    authorization_url: str

def get_auth_url(current_user: User):
    """
    Generates the Google OAuth 2.0 authorization URL, using the user's
    JWT as the state parameter to identify them on callback.
    """
    # Create a short-lived token to use as the state
    state_token = create_access_token(data={"sub": current_user.email, "role": current_user.role.name})
    url = get_authorization_url(state=state_token)
    return AuthUrlResponse(authorization_url=url)

def handle_google_callback(code: str, current_user: User, db: Session):
    """
    Handles the callback from Google, exchanges the code for tokens,
    and saves the refresh token to the database for the identified user.
    """
    try:
        token_data = exchange_code_for_tokens(code)
        refresh_token = token_data.get('refresh_token')

        if not refresh_token:
            raise HTTPException(status_code=400, detail="Refresh token not received from Google.")

        existing_token = db.query(GoogleAuthToken).filter(GoogleAuthToken.doctor_user_id == current_user.id).first()

        if existing_token:
            existing_token.refresh_token = refresh_token
        else:
            new_token = GoogleAuthToken(
                doctor_user_id=current_user.id,
                refresh_token=refresh_token
            )
            db.add(new_token)
        
        db.commit()
        
        return {"status": "success", "message": "Google Calendar has been successfully connected."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred during Google authentication: {str(e)}")

def disconnect_google_token(current_user: User, db: Session):
    """
    Deletes the GoogleAuthToken for the current user, effectively disconnecting
    their Google account.
    """
    token = db.query(GoogleAuthToken).filter(GoogleAuthToken.doctor_user_id == current_user.id).first()
    if token:
        db.delete(token)
        db.commit()
    return {"status": "success", "message": "Google account disconnected."}
