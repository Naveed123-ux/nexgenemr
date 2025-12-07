import os
import uuid
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from models.signature_model import UserSignature
from models.user_model import User
from schemas.signature_schema import SignatureResponse
from datetime import datetime
from PIL import Image
import io


class SignatureService:
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    
    # Max file size (2MB)
    MAX_FILE_SIZE = 2 * 1024 * 1024
    
    # Signature directory
    SIGNATURE_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images', 'signatures')
    
    @staticmethod
    def _ensure_signature_directory():
        """Ensure the signature directory exists"""
        os.makedirs(SignatureService.SIGNATURE_DIR, exist_ok=True)
    
    @staticmethod
    def _validate_file(file: UploadFile) -> None:
        """Validate uploaded file"""
        
        # Check file extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = file.filename.rsplit('.', 1)[-1].lower()
        if file_ext not in SignatureService.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(SignatureService.ALLOWED_EXTENSIONS)}"
            )
        
        # Check content type
        if file.content_type not in ['image/png', 'image/jpeg', 'image/jpg']:
            raise HTTPException(status_code=400, detail="Invalid content type. Must be PNG or JPEG")
    
    @staticmethod
    def _validate_image(file_content: bytes) -> None:
        """Validate that the file is a valid image"""
        try:
            image = Image.open(io.BytesIO(file_content))
            image.verify()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
    @staticmethod
    def _save_signature_file(file: UploadFile, user_id: int) -> tuple[str, int]:
        """
        Save signature file to disk
        Returns: (file_path, file_size)
        """
        
        # Ensure directory exists
        SignatureService._ensure_signature_directory()
        
        # Read file content
        file_content = file.file.read()
        file_size = len(file_content)
        
        # Check file size
        if file_size > SignatureService.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {SignatureService.MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Validate image
        SignatureService._validate_image(file_content)
        
        # Generate unique filename
        file_ext = file.filename.rsplit('.', 1)[-1].lower()
        unique_filename = f"signature_{user_id}_{uuid.uuid4().hex}.{file_ext}"
        file_path = os.path.join(SignatureService.SIGNATURE_DIR, unique_filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Return relative path for database storage
        relative_path = f"/static/images/signatures/{unique_filename}"
        
        return relative_path, file_size
    
    @staticmethod
    def _delete_old_signature_file(file_path: str) -> None:
        """Delete old signature file from disk"""
        try:
            # Convert relative path to absolute
            if file_path.startswith('/static/'):
                file_path = file_path.lstrip('/')
            
            full_path = os.path.join(
                os.path.dirname(__file__), 
                '..', 
                file_path
            )
            
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print(f"Error deleting old signature file: {e}")
    
    @staticmethod
    def upload_signature(
        db: Session,
        file: UploadFile,
        current_user: User
    ) -> SignatureResponse:
        """
        Upload or update user's e-signature
        """
        
        # Verify user role
        if current_user.role.name not in ["Doctor", "Staff", "Receptionist", "Hospital_Admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only doctors, staff, and hospital admins can upload signatures"
            )
        
        # Validate file
        SignatureService._validate_file(file)
        
        # Save file to disk
        file_path, file_size = SignatureService._save_signature_file(file, current_user.id)
        
        # Check if user already has a signature
        existing_signature = db.query(UserSignature).filter(
            UserSignature.user_id == current_user.id
        ).first()
        
        if existing_signature:
            # Delete old file
            SignatureService._delete_old_signature_file(existing_signature.signature_file_path)
            
            # Update existing signature
            existing_signature.signature_file_path = file_path
            existing_signature.original_filename = file.filename
            existing_signature.file_size = file_size
            existing_signature.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_signature)
            
            return existing_signature
        else:
            # Create new signature record
            new_signature = UserSignature(
                user_id=current_user.id,
                signature_file_path=file_path,
                original_filename=file.filename,
                file_size=file_size
            )
            
            db.add(new_signature)
            db.commit()
            db.refresh(new_signature)
            
            return new_signature
    
    @staticmethod
    def get_signature(
        db: Session,
        user_id: int,
        current_user: User
    ) -> SignatureResponse:
        """
        Get user's signature
        Users can view their own signature or staff can view any signature
        """
        
        # Check permissions
        if current_user.id != user_id:
            # Only staff/admins can view other users' signatures
            if current_user.role.name not in ["Staff", "Receptionist", "Hospital_Admin"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only view your own signature"
                )
        
        signature = db.query(UserSignature).filter(
            UserSignature.user_id == user_id,
            UserSignature.is_active == True
        ).first()
        
        if not signature:
            raise HTTPException(status_code=404, detail="Signature not found")
        
        return signature
    
    @staticmethod
    def get_my_signature(
        db: Session,
        current_user: User
    ) -> SignatureResponse:
        """Get current user's signature"""
        
        signature = db.query(UserSignature).filter(
            UserSignature.user_id == current_user.id,
            UserSignature.is_active == True
        ).first()
        
        if not signature:
            raise HTTPException(status_code=404, detail="You have not uploaded a signature yet")
        
        return signature
    
    @staticmethod
    def delete_signature(
        db: Session,
        current_user: User
    ) -> dict:
        """Delete user's signature"""
        
        signature = db.query(UserSignature).filter(
            UserSignature.user_id == current_user.id
        ).first()
        
        if not signature:
            raise HTTPException(status_code=404, detail="No signature found to delete")
        
        # Delete file from disk
        SignatureService._delete_old_signature_file(signature.signature_file_path)
        
        # Delete from database
        db.delete(signature)
        db.commit()
        
        return {"message": "Signature deleted successfully"}
