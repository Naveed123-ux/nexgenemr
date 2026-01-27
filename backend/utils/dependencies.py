from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from jose import JWTError
from typing import Optional

from db.db import get_db
from models.user_model import User
from models.role_model import Role
from models.doctor_profile_model import DoctorProfile
from utils.jwt import verify_token

http_bearer_scheme = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(http_bearer_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = creds.credentials
    try:
        payload = verify_token(token, credentials_exception)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Eagerly load all necessary relationships for efficiency
    users = db.query(User).options(
        joinedload(User.role).joinedload(Role.permissions),
        joinedload(User.hospital),
        joinedload(User.doctor_profile).joinedload(DoctorProfile.department),
        joinedload(User.staff_profile)
    ).all()

    for user in users:
        if user.email == email:
            return user
            
    raise credentials_exception

# --- NEW: The Dynamic Permission Checker ---
# --- NEW: The Dynamic Permission Checker ---
def require_permission(permission_name: str | list[str]):
    """
    This is a dependency factory. It creates a dependency that checks
    if the current user's role has the required permission.
    If a list is passed, it checks if the user has AT LEAST ONE of the permissions.
    """
    def permission_checker(current_user: User = Depends(get_current_user)):
        if not current_user.role or not current_user.role.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions for this action."
            )
        
        # Create a set of the user's permission names for fast lookup
        user_permissions = {p.name for p in current_user.role.permissions}
        
        if isinstance(permission_name, list):
            # Check if any of the required permissions are present
            if not any(p in user_permissions for p in permission_name):
                 raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: You lack any of the required permissions ({', '.join(permission_name)}) to perform this action."
                )
        else:
            if permission_name not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: You lack the permission required to perform this action."
                )
    
    return permission_checker
