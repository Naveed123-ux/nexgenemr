from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from db.db import get_db
from services import google_auth_service
from utils.dependencies import require_permission, get_current_user
from models.user_model import User
from utils.jwt import verify_token

router = APIRouter(prefix="/google/auth", tags=["Google Authentication"])

@router.get("/url", response_model=google_auth_service.AuthUrlResponse, dependencies=[Depends(require_permission("google:auth:connect"))])
def get_google_authorization_url(current_user: User = Depends(get_current_user)):
    """
    Provides the URL for a doctor to authorize the application.
    The user's JWT is embedded in the 'state' parameter.
    """
    return google_auth_service.get_auth_url(current_user)

@router.get("/callback")
def google_auth_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    The redirect URI that Google sends the user back to. This endpoint
    identifies the user from the 'state' query parameter.
    """
    state_token = request.query_params.get('state')
    code = request.query_params.get('code')

    if not state_token or not code:
        raise HTTPException(status_code=400, detail="Missing state or code from Google callback.")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials from state token",
    )
    
    try:
        payload = verify_token(state_token, credentials_exception)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    users = db.query(User).all()
    current_user = next((user for user in users if user.email == email), None)
            
    if not current_user:
        raise HTTPException(status_code=404, detail="User from state token not found.")

    google_auth_service.handle_google_callback(code, current_user, db)
    
    from fastapi.responses import HTMLResponse
    html_content = """
    <html>
        <body>
            <script>
                window.opener.postMessage('google-auth-success', '*');
                window.close();
            </script>
            <p>Authentication successful! This window will close automatically.</p>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)
    
@router.delete("/disconnect")
def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnects the Google account by deleting the saved tokens.
    """
    return google_auth_service.disconnect_google_token(current_user, db)
