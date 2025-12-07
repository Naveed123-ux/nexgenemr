from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SignatureResponse(BaseModel):
    id: int
    user_id: int
    signature_file_path: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    is_active: bool
    uploaded_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SignatureUploadResponse(BaseModel):
    message: str
    signature: SignatureResponse
