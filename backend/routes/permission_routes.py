from fastapi import APIRouter, Depends
from services.permission_service import PermissionCreate, PermissionResponse, create_permission, get_permissions, get_permission, update_permission, delete_permission
from sqlalchemy.orm import Session
from db.db import get_db
from typing import List
from utils.dependencies import require_permission

router = APIRouter()

@router.post("/", response_model=PermissionResponse, dependencies=[Depends(require_permission("permissions:create"))])
def create(permission: PermissionCreate, db: Session = Depends(get_db)):
    return create_permission(permission, db)

@router.get("/", response_model=List[PermissionResponse], dependencies=[Depends(require_permission("permissions:read:all"))])
def read_all(db: Session = Depends(get_db)):
    return get_permissions(db)

@router.get("/{permission_id}", response_model=PermissionResponse, dependencies=[Depends(require_permission("permissions:read:one"))])
def read(permission_id: int, db: Session = Depends(get_db)):
    return get_permission(permission_id, db)

@router.put("/{permission_id}", response_model=PermissionResponse, dependencies=[Depends(require_permission("permissions:update"))])
def update(permission_id: int, permission: PermissionCreate, db: Session = Depends(get_db)):
    return update_permission(permission_id, permission, db)

@router.delete("/{permission_id}", dependencies=[Depends(require_permission("permissions:delete"))])
def delete(permission_id: int, db: Session = Depends(get_db)):
    return delete_permission(permission_id, db)
