from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.db import get_db
from utils.dependencies import get_current_user
from models.user_model import User
from services.patient_task_service import PatientTaskService
from schemas.patient_task_schema import (
    PatientTaskCreate,
    PatientTaskUpdate,
    PatientTaskResponse,
    TaskGroupResponse
)

router = APIRouter()


@router.post("/generate", response_model=TaskGroupResponse, status_code=201)
def generate_patient_tasks(
    task_data: PatientTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate 4 AI-powered next-step tasks for a patient.
    
    - **Doctor/Staff only**
    - Uses Gemini AI to analyze patient data and generate actionable tasks
    - Can only generate new tasks when all current tasks are completed
    - Returns a task group with 4 one-liner tasks
    
    **Example Request:**
    ```json
    {
      "patient_user_id": 123
    }
    ```
    
    **Response:**
    - task_group_id: Unique identifier for this set of 4 tasks
    - tasks: Array of 4 task objects
    - all_completed: Boolean indicating if all tasks are done
    - created_at: Timestamp when tasks were generated
    """
    return PatientTaskService.create_tasks_for_patient(
        db=db,
        patient_user_id=task_data.patient_user_id,
        current_user=current_user
    )


@router.get("/patient/{patient_user_id}", response_model=TaskGroupResponse)
def get_patient_tasks(
    patient_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current task group for a patient.
    
    - **Doctor/Staff/Patient** can view
    - Returns the most recent task group (4 tasks)
    - Shows completion status for each task
    
    **Response:**
    - task_group_id: Unique identifier for this set of tasks
    - tasks: Array of task objects with completion status
    - all_completed: Boolean indicating if all 4 tasks are done
    - created_at: When these tasks were generated
    """
    return PatientTaskService.get_patient_tasks(
        db=db,
        patient_user_id=patient_user_id,
        current_user=current_user
    )


@router.patch("/{task_id}", response_model=PatientTaskResponse)
def update_task_status(
    task_id: int,
    update_data: PatientTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a task as completed or incomplete.
    
    - **Doctor/Staff only**
    - Updates the completion status of a single task
    - Sets completed_at timestamp when marked complete
    
    **Example Request:**
    ```json
    {
      "is_completed": true
    }
    ```
    
    **Response:**
    - Updated task object with new completion status
    """
    return PatientTaskService.update_task_status(
        db=db,
        task_id=task_id,
        is_completed=update_data.is_completed,
        current_user=current_user
    )


@router.get("/can-generate/{patient_user_id}")
def check_can_generate_tasks(
    patient_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if new tasks can be generated for a patient.
    
    - Returns true if all current tasks are completed or no tasks exist
    - Returns false if there are incomplete tasks
    
    **Response:**
    ```json
    {
      "can_generate": true,
      "message": "All current tasks are completed. New tasks can be generated."
    }
    ```
    """
    can_generate = PatientTaskService.can_generate_new_tasks(db, patient_user_id)
    
    if can_generate:
        return {
            "can_generate": True,
            "message": "New tasks can be generated."
        }
    else:
        return {
            "can_generate": False,
            "message": "Cannot generate new tasks. Please complete all current tasks first."
        }
