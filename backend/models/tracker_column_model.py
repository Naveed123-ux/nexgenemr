# EMR-BACKEND/models/tracker_column_model.py

from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from db.db import Base

# Association Table to link Roles to Tracker Columns
role_tracker_column_association = Table('role_tracker_column_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('tracker_column_id', Integer, ForeignKey('tracker_columns.id'), primary_key=True)
)

class TrackerColumn(Base):
    """
    Represents a master list of all possible columns that can appear on the tracker board.
    """
    __tablename__ = "tracker_columns"

    id = Column(Integer, primary_key=True, index=True)
    # The unique key for the column, used by the frontend to identify the data.
    column_key = Column(String, unique=True, nullable=False)
    # The default, human-readable name for the column header.
    display_name = Column(String, nullable=False)

    # Relationship to roles that have access to this column
    roles = relationship(
        "Role",
        secondary=role_tracker_column_association,
        back_populates="tracker_columns"
    )

def populate_initial_tracker_columns(db_session):
    """
    Populates the tracker_columns table with the initial set of columns
    from the client's image. This should be run once when the app starts.
    """
    initial_columns = [
        {"column_key": "bay_or_room", "display_name": "Bay / Rm"},
        {"column_key": "patient_name", "display_name": "Name"},
        {"column_key": "triage_level", "display_name": "T"},
        {"column_key": "length_of_stay", "display_name": "LOS"},
        {"column_key": "assigned_md", "display_name": "MD"},
        {"column_key": "assigned_resident_pa", "display_name": "Res/PA"},
        {"column_key": "assigned_rn", "display_name": "RN"},
        {"column_key": "chief_complaint", "display_name": "CC"},
        {"column_key": "lab_status", "display_name": "LAB"},
        {"column_key": "radiology_status", "display_name": "RAD"},
        {"column_key": "medication_status", "display_name": "MED"},
        {"column_key": "disposition", "display_name": "D"},
        {"column_key": "notes", "display_name": "Notes"},
        {"column_key": "visit_status", "display_name": "Status"},
        {"column_key": "room_status", "display_name": "Room Status"},
    ]

    for col_data in initial_columns:
        exists = db_session.query(TrackerColumn).filter_by(column_key=col_data["column_key"]).first()
        if not exists:
            new_col = TrackerColumn(column_key=col_data["column_key"], display_name=col_data["display_name"])
            db_session.add(new_col)
    db_session.commit()