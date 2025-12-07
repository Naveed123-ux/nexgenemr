import cloudinary
import cloudinary.uploader
import os
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary using credentials from .env
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_image(file: UploadFile, required_format: str, max_size_kb: int, required_dims: tuple):
    """
    Uploads an image to Cloudinary with validation for format, size, and dimensions.
    
    :param file: The image file to upload.
    :param required_format: The required image format (e.g., 'png').
    :param max_size_kb: The maximum allowed file size in kilobytes.
    :param required_dims: A tuple for required dimensions (width, height).
    :return: The secure URL of the uploaded image.
    """
    # 1. Validate file format
    file_format = file.filename.split('.')[-1].lower()
    if file_format != required_format:
        raise HTTPException(status_code=400, detail=f"Invalid image format. Required: .{required_format}")

    # 2. Validate file size
    file_size_kb = file.size / 1024
    if file_size_kb > max_size_kb:
        raise HTTPException(status_code=400, detail=f"Image size exceeds the limit of {max_size_kb} KB.")

    try:
        # 3. Upload to Cloudinary and validate dimensions
        upload_result = cloudinary.uploader.upload(
            file.file,
            # Transformation to enforce dimensions
            transformation=[
                {'width': required_dims[0], 'height': required_dims[1], 'crop': 'limit'}
            ]
        )
        
        # Check if the uploaded image dimensions match the required ones
        if upload_result['width'] != required_dims[0] or upload_result['height'] != required_dims[1]:
             raise HTTPException(status_code=400, detail=f"Image dimensions are incorrect. Required: {required_dims[0]}x{required_dims[1]} pixels.")


        return upload_result['secure_url']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image to Cloudinary: {str(e)}")
