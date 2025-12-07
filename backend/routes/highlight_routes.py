from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.db import get_db
from services import highlight_service
from utils.dependencies import require_permission

router = APIRouter(
    prefix="/highlights",
    tags=["AI Highlights"]
)

@router.get(
    "/contextual/{soap_note_id}", 
    response_model=highlight_service.HighlightResponse, 
)
def get_contextual_highlights(
    soap_note_id: int,
    db: Session = Depends(get_db)
):
    """
    Analyzes a saved SOAP note against the patient's history and vitals
    to generate and return contextual highlights of concern.
    """
    return highlight_service.generate_contextual_highlights(soap_note_id, db)