from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from models.role_model import Role
from models.permission_model import Permission
from pydantic import BaseModel
from typing import List
from db.db import get_db
from datetime import datetime
from utils.encryption import encrypt_field

class RoleCreate(BaseModel):
    name: str
    isactive: bool = False
    permissions: List[int] = []

class RoleResponse(BaseModel):
    id: int
    name: str
    isactive: bool
    created_at: str
    updated_at: str
    permissions: List[int] = []

def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    try:
        if not role.name or len(role.name.strip()) == 0:
            raise ValueError("Name cannot be empty")
        
        now_str = str(datetime.utcnow())
        
        permissions = db.query(Permission).filter(Permission.id.in_(role.permissions)).all()
        
        db_role = Role(
            name=role.name, 
            isactive=role.isactive,
            created_at=now_str,
            updated_at=now_str
        )
        db_role.permissions.extend(permissions)
        
        db.add(db_role)
        db.commit()
        db.refresh(db_role)
        return RoleResponse(id=db_role.id, name=db_role.name, isactive=db_role.isactive, created_at=db_role.created_at, updated_at=db_role.updated_at, permissions=[p.id for p in db_role.permissions])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def get_roles(db: Session = Depends(get_db)) -> List[RoleResponse]:
    roles = db.query(Role).all()
    return [RoleResponse(id=r.id, name=r.name, isactive=r.isactive, created_at=r.created_at, updated_at=r.updated_at, permissions=[p.id for p in r.permissions]) for r in roles]

def get_role(role_id: int, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return RoleResponse(id=role.id, name=role.name, isactive=role.isactive, created_at=role.created_at, updated_at=role.updated_at, permissions=[p.id for p in role.permissions])

def update_role(role_id: int, role: RoleCreate, db: Session = Depends(get_db)):
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    if not role.name or len(role.name.strip()) == 0:
        raise ValueError("Name cannot be empty")
        
    permissions = db.query(Permission).filter(Permission.id.in_(role.permissions)).all()

    db_role.name = encrypt_field(role.name)
    db_role.isactive = role.isactive
    db_role.updated_at = encrypt_field(str(datetime.utcnow()))
    db_role.permissions = permissions

    db.commit()
    db.refresh(db_role)
    return RoleResponse(id=db_role.id, name=db_role.name, isactive=db_role.isactive, created_at=db_role.created_at, updated_at=db_role.updated_at, permissions=[p.id for p in db_role.permissions])

def delete_role(role_id: int, db: Session = Depends(get_db)):
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(db_role)
    db.commit()
    return {"detail": "Role deleted"}