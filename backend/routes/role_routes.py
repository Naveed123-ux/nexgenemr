from fastapi import APIRouter, Depends
from services.role_service import RoleCreate, RoleResponse, create_role, get_roles, get_role, update_role, delete_role
from sqlalchemy.orm import Session
from db.db import get_db
from typing import List
from utils.dependencies import require_permission

router = APIRouter()

@router.post("/", response_model=RoleResponse, dependencies=[Depends(require_permission("roles:create"))])
def create(role: RoleCreate, db: Session = Depends(get_db)):
    return create_role(role, db)

@router.get("/", response_model=List[RoleResponse], dependencies=[Depends(require_permission("roles:read:all"))])
def read_all(db: Session = Depends(get_db)):
    return get_roles(db)

@router.get("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission("roles:read:one"))])
def read(role_id: int, db: Session = Depends(get_db)):
    return get_role(role_id, db)

@router.put("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission("roles:update"))])
def update(role_id: int, role: RoleCreate, db: Session = Depends(get_db)):
    return update_role(role_id, role, db)

@router.delete("/{role_id}", dependencies=[Depends(require_permission("roles:delete"))])
def delete(role_id: int, db: Session = Depends(get_db)):
    return delete_role(role_id, db)
