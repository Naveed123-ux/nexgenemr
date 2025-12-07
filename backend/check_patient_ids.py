#!/usr/bin/env python3
"""
Quick script to check available patient profile IDs in the database
"""

import sys
sys.path.append('.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.patient_profile_model import PatientProfile
from models.user_model import User
from db.db import get_db_url

# Create database connection
engine = create_engine(get_db_url())
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get all patients with their user info
    patients = db.query(PatientProfile).join(User).limit(20).all()
    
    if not patients:
        print("No patients found in the database!")
    else:
        print(f"Found {len(patients)} patients:\n")
        print(f"{'ID':<5} {'Profile ID':<12} {'Name':<30} {'Email':<30}")
        print("-" * 80)
        
        for patient in patients:
            user = patient.user
            name = f"{user.first_name} {user.last_name}"
            print(f"{user.id:<5} {patient.id:<12} {name:<30} {user.email:<30}")
        
        print("\n" + "=" * 80)
        print("Use the 'Profile ID' column value for the endpoint:")
        print(f"Example: GET /patients/{patients[0].id}/doctors")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
