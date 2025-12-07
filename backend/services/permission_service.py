from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, ProgrammingError
from cryptography.fernet import InvalidToken
from models.permission_model import Permission
from pydantic import BaseModel
from typing import List
from db.db import get_db
from datetime import datetime
from utils.encryption import encrypt_field

class PermissionCreate(BaseModel):
    name: str
    isactive: bool = False

class PermissionResponse(BaseModel):
    id: int
    name: str
    isactive: bool
    created_at: str
    updated_at: str

def create_permission(permission: PermissionCreate, db: Session = Depends(get_db)):
    try:
        if not permission.name or len(permission.name.strip()) == 0:
            raise ValueError("Name cannot be empty")
        
        now_str = str(datetime.utcnow())
        db_permission = Permission(
            name=permission.name, 
            isactive=permission.isactive,
            created_at=now_str,
            updated_at=now_str
        )
        
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        return PermissionResponse(id=db_permission.id, name=db_permission.name, isactive=db_permission.isactive, created_at=db_permission.created_at, updated_at=db_permission.updated_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OperationalError as e:
        raise HTTPException(status_code=400, detail=f"Database connection error: {str(e)}")
    except ProgrammingError as e:
        raise HTTPException(status_code=400, detail=f"Database schema error: {str(e)}")
    except InvalidToken as e:
        raise HTTPException(status_code=400, detail="Encryption key invalid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e) or 'Unknown error'}")

def get_permissions(db: Session = Depends(get_db)) -> List[PermissionResponse]:
    try:
        permissions = db.query(Permission).all()
        return [PermissionResponse(id=p.id, name=p.name, isactive=p.isactive, created_at=p.created_at, updated_at=p.updated_at) for p in permissions]
    except OperationalError as e:
        raise HTTPException(status_code=400, detail=f"Database connection error: {str(e)}")
    except ProgrammingError as e:
        raise HTTPException(status_code=400, detail=f"Database schema error: {str(e)}")
    except InvalidToken as e:
        raise HTTPException(status_code=400, detail="Encryption key invalid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e) or 'Unknown error'}")

def get_permission(permission_id: int, db: Session = Depends(get_db)):
    try:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if permission is None:
            raise ValueError("Permission not found")
        return PermissionResponse(id=permission.id, name=permission.name, isactive=permission.isactive, created_at=permission.created_at, updated_at=permission.updated_at)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except OperationalError as e:
        raise HTTPException(status_code=400, detail=f"Database connection error: {str(e)}")
    except ProgrammingError as e:
        raise HTTPException(status_code=400, detail=f"Database schema error: {str(e)}")
    except InvalidToken as e:
        raise HTTPException(status_code=400, detail="Encryption key invalid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e) or 'Unknown error'}")

def update_permission(permission_id: int, permission: PermissionCreate, db: Session = Depends(get_db)):
    try:
        if not permission.name or len(permission.name.strip()) == 0:
            raise ValueError("Name cannot be empty")
        
        db_permission = db.query(Permission).filter(Permission.id == permission_id).first()
        
        if db_permission is None:
            raise ValueError("Permission not found")
        
        # Manually encrypt the fields before saving
        db_permission.name = encrypt_field(permission.name)
        db_permission.isactive = permission.isactive
        db_permission.updated_at = encrypt_field(str(datetime.utcnow()))
        
        db.commit()
        db.refresh(db_permission)
        return PermissionResponse(id=db_permission.id, name=db_permission.name, isactive=db_permission.isactive, created_at=db_permission.created_at, updated_at=db_permission.updated_at)
    except ValueError as e:
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 400, detail=str(e))
    except OperationalError as e:
        raise HTTPException(status_code=400, detail=f"Database connection error: {str(e)}")
    except ProgrammingError as e:
        raise HTTPException(status_code=400, detail=f"Database schema error: {str(e)}")
    except InvalidToken as e:
        raise HTTPException(status_code=400, detail="Encryption key invalid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e) or 'Unknown error'}")

def delete_permission(permission_id: int, db: Session = Depends(get_db)):
    try:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if permission is None:
            raise ValueError("Permission not found")
        db.delete(permission)
        db.commit()
        return {"detail": "Permission deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except OperationalError as e:
        raise HTTPException(status_code=400, detail=f"Database connection error: {str(e)}")
    except ProgrammingError as e:
        raise HTTPException(status_code=400, detail=f"Database schema error: {str(e)}")
    except InvalidToken as e:
        raise HTTPException(status_code=400, detail="Encryption key invalid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e) or 'Unknown error'}")