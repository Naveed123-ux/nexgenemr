"""
Permission decorators for role-based access control
"""
from functools import wraps
from fastapi import HTTPException, status
from typing import Set, Callable
from models.user_model import User


def require_waitlist_permission(func: Callable):
    """
    Decorator to check if user has permission to manage waitlist.
    Allowed roles: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    Usage:
        @router.post("/entries")
        @require_waitlist_permission
        def create_waitlist_entry(current_user: User = Depends(get_current_user), ...):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract current_user from kwargs
        current_user = kwargs.get('current_user')
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions for this action."
            )
        
        allowed_roles: Set[str] = {"Front_Desk_Staff", "Receptionist", "Hospital_Admin"}
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only Front Desk Staff, Receptionists, and Hospital Admins can manage waitlist entries."
            )
        
        # Call the original function
        return await func(*args, **kwargs)
    
    return wrapper


def check_waitlist_permission(current_user: User) -> None:
    """
    Function to check if user has permission to manage waitlist.
    Allowed roles: Front_Desk_Staff, Receptionist, Hospital_Admin
    
    Raises HTTPException if user doesn't have permission.
    
    Usage:
        def my_endpoint(current_user: User = Depends(get_current_user), ...):
            check_waitlist_permission(current_user)
            ...
    """
    if not current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required permissions for this action."
        )
    
    allowed_roles: Set[str] = {"Front_Desk_Staff", "Receptionist", "Hospital_Admin"}
    if current_user.role.name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Front Desk Staff, Receptionists, and Hospital Admins can manage waitlist entries."
        )


def require_roles(*allowed_roles: str):
    """
    Generic decorator to check if user has one of the specified roles.
    
    Usage:
        @router.get("/admin-only")
        @require_roles("Hospital_Admin", "Superadmin")
        def admin_endpoint(current_user: User = Depends(get_current_user), ...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not current_user.role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have the required permissions for this action."
                )
            
            if current_user.role.name not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: This action requires one of the following roles: {', '.join(allowed_roles)}"
                )
            
            # Call the original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
