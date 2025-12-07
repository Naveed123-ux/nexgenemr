from sqlalchemy import Column, Integer, String, Text
from db.db import Base

class ICDCode(Base):
    __tablename__ = "icd_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    # Use Text for longer descriptions to avoid length issues
    description = Column(Text, nullable=False)