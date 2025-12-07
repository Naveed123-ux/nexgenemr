from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from schemas.claim_schema import Claim, ClaimUpdate, ClaimDecline, ClaimWithICDDescription
from models.claim_model import ClaimStatus
from services import claim_service
from db.db import get_db
import traceback  # Import the traceback module

router = APIRouter()

@router.post("/generate/{patient_id}", status_code=status.HTTP_201_CREATED, tags=["Claims"])
def generate_claims_for_patient_endpoint(patient_id: int, db: Session = Depends(get_db)):
    """
    Automatically generates claims for all billable appointments of a given patient.
    """
    try:
        # This is where the service function is called.
        result = claim_service.generate_claims_for_patient(db=db, patient_id=patient_id)
        return result
    except ValueError as e:
        # This will catch specific errors we raise on purpose (like "Patient not found")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # This is the new, powerful part. It will catch ANY other error.
        print("!!! AN UNEXPECTED ERROR OCCURRED !!!")
        # This line prints the full, detailed error to your console
        traceback.print_exc()
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        # And this line sends the generic message back to the client
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Check the server logs for details.")


@router.get("/", response_model=list[ClaimWithICDDescription], tags=["Claims"])
def read_claims(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get all claims with ICD code descriptions included.
    Returns enhanced claim information including the full description of each ICD code.
    """
    claims = claim_service.get_claims(db, skip=skip, limit=limit)
    return claims

@router.put("/{claim_id}", response_model=Claim, tags=["Claims"])
def update_claim(claim_id: int, claim_update: ClaimUpdate, db: Session = Depends(get_db)):
    try:
        db_claim = claim_service.update_claim_status(db, claim_id, claim_update)
        if db_claim is None:
            raise HTTPException(status_code=404, detail="Claim not found")
        return db_claim
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{claim_id}/eligibility", tags=["Claims"])
def check_claim_eligibility_endpoint(claim_id: int, db: Session = Depends(get_db)):
    """
    Performs a mock eligibility check for a given claim and returns a detailed JSON response.
    """
    try:
        eligibility_data = claim_service.check_claim_eligibility(db=db, claim_id=claim_id)
        return JSONResponse(content=eligibility_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred while checking eligibility.")
    


@router.post("/{claim_id}/submit", tags=["Claims"])
def send_claim_to_payer_endpoint(claim_id: int, db: Session = Depends(get_db)):
    """
    Simulates sending a prepared claim to the payer based on real data.
    """
    try:
        submission_response = claim_service.send_claim_to_payer(db=db, claim_id=claim_id)
        return JSONResponse(content=submission_response)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred during claim submission.")
    

@router.post("/{claim_id}/accept", response_model=Claim, tags=["Claims"])
def accept_claim_endpoint(claim_id: int, db: Session = Depends(get_db)):
    """
    Accept a claim and update its status to 'paid'.
    """
    try:
        accepted_claim = claim_service.accept_claim(db=db, claim_id=claim_id)
        return accepted_claim
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@router.post("/{claim_id}/decline", response_model=Claim, tags=["Claims"])
def decline_claim_endpoint(claim_id: int, decline_data: ClaimDecline, db: Session = Depends(get_db)):
    """
    Decline a claim and provide a reason.
    """
    try:
        declined_claim = claim_service.decline_claim(db=db, claim_id=claim_id, decline_data=decline_data)
        return declined_claim
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@router.delete("/{claim_id}", status_code=status.HTTP_200_OK)
def delete_existing_claim(claim_id: int, db: Session = Depends(get_db)):
    return claim_service.delete_claim(db=db, claim_id=claim_id)