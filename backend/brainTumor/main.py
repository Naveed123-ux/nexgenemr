import io
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image
from model_utils import load_model, get_transform, CLA_LABEL, CNN_TUMOR
import os

app = FastAPI(title="Brain Tumor Detection API")

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "Brain_Tumor_model.pt")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# Load model on startup
device = torch.device('cpu')
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model file {MODEL_PATH} not found!")

model = load_model(MODEL_PATH, device)
transform = get_transform()

@app.get("/")
async def root():
    return {"message": "Brain Tumor Detection API is running. Go to /docs for Swagger UI."}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 1. Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Validate file size
    # We read a small chunk first or check content length if available
    # But since UploadFile might not have size easily until read, we read it
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail="File size exceeds 10MB limit."
        )

    # 3. Process image
    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image_tensor = transform(image).unsqueeze(0).to(device)
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error processing image: {str(e)}"
        )

    # 4. Inference
    with torch.no_grad():
        output = model(image_tensor)
        confidence, predicted_idx = torch.max(torch.exp(output), 1)
        
    prediction = CLA_LABEL[predicted_idx.item()]
    
    return {
        "filename": file.filename,
        "prediction": prediction,
        "confidence": round(confidence.item(), 4)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
