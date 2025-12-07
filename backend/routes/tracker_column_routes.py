from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from db.db import get_db
from services import tracker_column_service
# --- START OF CHANGES ---
# Import the get_current_user dependency and the User model
from utils.dependencies import require_permission, get_current_user
from models.user_model import User
# --- END OF CHANGES ---

router = APIRouter(
    prefix="/tracker-columns",
    tags=["Tracker Column Management"]
)

# --- START OF CHANGES ---
# NEW ROUTE: Get columns for the currently logged-in user
@router.get("/me", response_model=List[tracker_column_service.ColumnResponse])
def get_my_role_columns(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Get the specific tracker columns that the currently logged-in user can see,
    determined by their assigned role.
    """
    if not current_user.role or not current_user.role.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User role not found or not configured."
        )
    
    return tracker_column_service.get_columns_for_role(current_user.role.id, db)
# --- END OF CHANGES ---


@router.get("/", response_model=List[tracker_column_service.ColumnResponse], dependencies=[Depends(require_permission("tracker:columns:read"))])
def get_master_column_list(db: Session = Depends(get_db)):
    """
    Get the master list of all possible tracker columns available in the system.
    (For Admins to build the UI).
    """
    return tracker_column_service.get_all_tracker_columns(db)

@router.get("/role/{role_id}", response_model=List[tracker_column_service.ColumnResponse])
def get_columns_for_a_role(role_id: int, db: Session = Depends(get_db)):
    """
    Get the specific tracker columns a user with a given role can see.
    (For Admins or for testing purposes).
    """
    return tracker_column_service.get_columns_for_role(role_id, db)

@router.put("/role/{role_id}", response_model=List[tracker_column_service.ColumnResponse], dependencies=[Depends(require_permission("tracker:columns:assign"))])
def assign_columns_to_role(
    role_id: int, 
    request: tracker_column_service.ColumnAccessRequest, 
    db: Session = Depends(get_db)
):
    """
    Assign a specific set of visible columns to a role.
    This overwrites previous settings. To revoke all access, send an empty list [].
    """
    return tracker_column_service.update_role_column_access(role_id, request, db)


@router.get("/data", response_model=List[Dict[str, Any]])
def get_patient_data_for_tracker(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the live patient data for the tracker board. 
    The data returned is for the hospital associated with the logged-in user's token.
    The specific columns to display are determined by calling the '/tracker-columns/me' endpoint first.
    """
    return tracker_column_service.get_tracker_patient_data(current_user, db)