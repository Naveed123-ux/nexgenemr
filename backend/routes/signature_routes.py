from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from services.signature_service import SignatureService
from schemas.signature_schema import SignatureResponse, SignatureUploadResponse

router = APIRouter()


@router.post("/upload", response_model=SignatureUploadResponse, status_code=201)
async def upload_signature(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload or update e-signature (PNG/JPEG).
    
    - **Doctor, Staff, Receptionist, Hospital_Admin only**
    - Accepts PNG or JPEG files
    - Maximum file size: 2MB
    - Replaces existing signature if one exists
    
    **File Requirements:**
    - Format: PNG, JPG, or JPEG
    - Max size: 2MB
    - Must be a valid image file
    
    **Response:**
    - Returns signature details including file path
    - File is accessible at: `http://127.0.0.1:8000{signature_file_path}`
    """
    signature = SignatureService.upload_signature(db, file, current_user)
    
    return SignatureUploadResponse(
        message="Signature uploaded successfully",
        signature=SignatureResponse.from_orm(signature)
    )


@router.get("/my-signature", response_model=SignatureResponse)
def get_my_signature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's signature.
    
    - Returns the authenticated user's signature
    - Returns 404 if no signature uploaded yet
    
    **Response:**
    - Signature details including file path
    - Access signature at: `http://127.0.0.1:8000{signature_file_path}`
    """
    return SignatureService.get_my_signature(db, current_user)


@router.get("/user/{user_id}", response_model=SignatureResponse)
def get_user_signature(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user's signature.
    
    - Users can view their own signature
    - Staff/Admins can view any user's signature
    
    **Permissions:**
    - Own signature: Any authenticated user
    - Other signatures: Staff, Receptionist, Hospital_Admin only
    
    **Response:**
    - Signature details including file path
    """
    return SignatureService.get_signature(db, user_id, current_user)


@router.delete("/delete", status_code=200)
def delete_signature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete current user's signature.
    
    - Removes signature file from server
    - Deletes signature record from database
    
    **Response:**
    ```json
    {
      "message": "Signature deleted successfully"
    }
    ```
    """
    return SignatureService.delete_signature(db, current_user)


@router.get("/has-signature")
def check_has_signature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if current user has uploaded a signature.
    
    **Response:**
    ```json
    {
      "has_signature": true,
      "signature_url": "/static/images/signatures/signature_123_abc.png"
    }
    ```
    
    Or if no signature:
    ```json
    {
      "has_signature": false,
      "signature_url": null
    }
    ```
    """
    try:
        signature = SignatureService.get_my_signature(db, current_user)
        return {
            "has_signature": True,
            "signature_url": signature.signature_file_path
        }
    except HTTPException:
        return {
            "has_signature": False,
            "signature_url": None
        }
