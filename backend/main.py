import json
import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import Message
from sqlalchemy.orm import Session, joinedload
import socketio
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

# Import your routers
from routes.permission_routes import router as permission_router
from routes.role_routes import router as role_router
from routes.user_routes import router as user_router
from routes.hospital_routes import router as hospital_router
from routes.doctor_routes import router as doctor_router
from routes.department_routes import router as department_router
from routes.patient_routes import router as patient_router
from routes.session_management_routes import router as session_management_router
from routes.staff_routes import router as staff_router
from routes.google_auth_routes import router as google_router
from routes.audit_log_routes import router as audit_log_router
from routes.appointment_routes import router as appointment_router
from routes.appointment_session_routes import router as appointment_session_router
from routes.messaging_routes import router as messaging_router
from routes.tracker_column_routes import router as tracker_router
from routes.soap_notes_routes import router as soap_router
from routes.clinical_data_routes import router as clinical_router
from routes.patient_snapshot_routes import router as snapshot_router
from routes.patient_list_routes import router as patient_list_router
from routes.hospital_request_routes import router as hospital_request_router
from routes.highlight_routes import router as highlight_router
from routes.synopsis_routes import router as synopsis_router
from routes.lab_result_routes import router as lab_result_router
from routes.icd_code_routes import router as icd_code_router
from routes.prescription_routes import router as prescription_router 
from routes.patient_dashboard_routes import router as patient_dashboard_router
from routes.appointment_request_routes import router as appointment_request_router
from routes.claim_routes import router as claim_router # Import the new claim router
from routes.billing_routes import router as billing_router # Import the billing router
from routes.analytics_routes import router as analytics_router # Import the analytics router
from routes.invoice_routes import router as invoice_router # Import the invoice router
from routes.discharge_summary_routes import router as discharge_summary_router # Import discharge summary router
from routes.handoff_note_routes import router as handoff_note_router # Import handoff note router
from routes.patient_summary_routes import router as patient_summary_router # Import patient summary router
from routes.patient_task_routes import router as patient_task_router # Import patient task router
from routes.signature_routes import router as signature_router # Import signature router
from routes.slot_management_routes import router as slot_management_router # Import slot management router
from routes.waitlist_routes import router as waitlist_router # Import waitlist router
from routes.lab_request_routes import router as lab_request_router # Import lab request router

# DB + Utils
from db.db import Base, engine, get_db
from models.user_model import User
from utils.jwt import verify_token
from utils.socket import sio
from middleware.audit_middleware import AuditMiddleware
from scheduler import start_scheduler, stop_scheduler


# Create static directories on startup
def create_static_directories():
    """Create static directory structure for images, logos, stamps, etc."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(base_dir, 'static')
    images_dir = os.path.join(static_dir, 'images')
    
    # Create main directories
    os.makedirs(images_dir, exist_ok=True)
    
    # Create subdirectories for organization
    subdirs = ['logos', 'stamps', 'signatures', 'icons']
    for subdir in subdirs:
        os.makedirs(os.path.join(images_dir, subdir), exist_ok=True)
    
    print(f"✅ Static directories created at: {static_dir}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    create_static_directories()
    start_scheduler()
    yield
    # Code to run on shutdown
    stop_scheduler()

# 1. Initialize FastAPI
app = FastAPI(
    title="NexgenEMR API",
    description="NexgenEMR API with Socket.IO support",
    version="1.0.0",
    lifespan=lifespan
)

# 2. CORS - Allow all origins for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# 3. Middleware
app.add_middleware(AuditMiddleware) # Add the new audit middleware

async def set_body(request: Request, body: bytes):
    async def receive() -> Message:
        return {"type": "http.request", "body": body}
    request._receive = receive


# 4. Routers
app.include_router(permission_router, prefix="/permissions", tags=["permissions"])
app.include_router(role_router, prefix="/roles", tags=["roles"])
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(hospital_router, prefix="/hospitals", tags=["hospitals"])
app.include_router(department_router, prefix="/departments", tags=["departments"])
app.include_router(doctor_router, prefix="/doctors", tags=["doctors"])
app.include_router(patient_router, prefix="/patients", tags=["patients"])
app.include_router(session_management_router, tags=["Session Management"])
app.include_router(google_router, tags=["Google Authentication"])
app.include_router(staff_router, prefix="/staff", tags=["Staff"])
app.include_router(messaging_router)
app.include_router(appointment_router, prefix="/appointments", tags=["Appointment"])
app.include_router(appointment_session_router, prefix="/api", tags=["Appointment Sessions"])
app.include_router(audit_log_router, prefix="/audit-logs", tags=["Audit Logs"])
app.include_router(tracker_router)
app.include_router(messaging_router)
app.include_router(soap_router)
app.include_router(clinical_router)
app.include_router(snapshot_router)
app.include_router(patient_list_router)
app.include_router(hospital_request_router)
app.include_router(highlight_router)
app.include_router(synopsis_router)
app.include_router(lab_result_router)
app.include_router(icd_code_router) 
app.include_router(prescription_router)
app.include_router(patient_dashboard_router)
app.include_router(appointment_request_router, tags=["Appointment Requests"])
app.include_router(claim_router, prefix="/claims", tags=["Claims"])
app.include_router(billing_router, prefix="/bills", tags=["Billing"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(invoice_router, prefix="/invoices", tags=["Invoices"])
app.include_router(discharge_summary_router, prefix="/discharge-summaries", tags=["Discharge Summaries"])
app.include_router(handoff_note_router, prefix="/handoff-notes", tags=["Handoff Notes"])
app.include_router(patient_summary_router, prefix="/patient-summaries", tags=["Patient Summaries"])
app.include_router(patient_task_router, prefix="/patient-tasks", tags=["Patient Tasks"])
app.include_router(signature_router, prefix="/signatures", tags=["E-Signatures"])
app.include_router(slot_management_router, tags=["Slot Management"])
app.include_router(waitlist_router, prefix="/api/waitlist", tags=["Waitlist"])
app.include_router(lab_request_router, prefix="/lab-requests", tags=["Lab Requests"])


# Mount static files
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 5. Extra endpoints
@app.get("/socket-health")
async def socket_health():
    return {"status": "ok", "socket_io": "enabled", "path": "/ws/socket.io"}

@app.get("/")
async def root():
    return {"message": "Healthcare API with Socket.IO", "docs": "/docs", "socket": "/ws/socket.io"}

@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# 6. Mount Socket.IO under /ws
app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")

# 7. Create tables
Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
