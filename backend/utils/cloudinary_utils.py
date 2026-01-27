import cloudinary
import cloudinary.uploader
import os
from fastapi import UploadFile, HTTPException
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary using credentials from .env
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_image(file: UploadFile):
    """
    Directly uploads an image to Cloudinary without any transformations or restrictions.
    """
    try:
        upload_result = cloudinary.uploader.upload(file.file)
        return upload_result['secure_url']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image to Cloudinary: {str(e)}")
