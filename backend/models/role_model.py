# EMR-BACKEND/models/role_model.py

from sqlalchemy import Column, Integer, String, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base
from utils.encryption import encrypt_field, decrypt_field

# --- START OF CHANGES ---
# Import the new association table from your new model file
from models.tracker_column_model import role_tracker_column_association
# --- END OF CHANGES ---


# Association Table for Role and Permission
role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    isactive = Column(Boolean, default=False)
    created_at = Column(String)
    updated_at = Column(String)
    
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

    # --- START OF CHANGES ---
    # Add the missing relationship to the TrackerColumn model
    tracker_columns = relationship(
        "TrackerColumn",
        secondary=role_tracker_column_association,
        back_populates="roles"
    )
    # --- END OF CHANGES ---

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