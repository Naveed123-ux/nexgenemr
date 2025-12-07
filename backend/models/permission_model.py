from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field
from models.role_model import role_permissions

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    isactive = Column(Boolean, default=False)
    created_at = Column(String)
    updated_at = Column(String)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            if key in ["name", "created_at", "updated_at"] and value is not None:
                setattr(self, key, encrypt_field(str(value)))
            else:
                setattr(self, key, value)

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if name in ["name", "created_at", "updated_at"] and value is not None:
            return decrypt_field(value)
        return value