"""
Check appointments to debug swap 403 error
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.db import SessionLocal

def check_appointments():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("CHECKING APPOINTMENTS FOR SWAP DEBUG")
        print("=" * 60)
        
        # Get all appointments with doctor info
        result = db.execute(text("""
            SELECT 
                a.id as appointment_id,
                a.doctor_user_id,
                a.patient_profile_id,
                u.id as user_id,
                u.email as doctor_email,
                u.first_name,
                u.last_name,
                r.name as role_name,
                p.user_id as patient_user_id
            FROM appointments a
            JOIN users u ON a.doctor_user_id = u.id
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN patient_profiles p ON a.patient_profile_id = p.id
            ORDER BY a.id
        """))
        
        appointments = result.fetchall()
        
        print(f"\n📋 Found {len(appointments)} appointments:\n")
        
        for appt in appointments:
            appt_id, doctor_user_id, patient_profile_id, user_id, email, first, last, role, patient_user_id = appt
            print(f"Appointment ID: {appt_id}")
            print(f"  Doctor User ID: {doctor_user_id}")
            print(f"  Doctor Name: {first} {last}")
            print(f"  Doctor Email: {email}")
            print(f"  Doctor Role: {role}")
            print(f"  Patient Profile ID: {patient_profile_id}")
            print(f"  Patient User ID: {patient_user_id}")
            print()
        
        # Check if there are appointments from the same doctor
        result = db.execute(text("""
            SELECT doctor_user_id, COUNT(*) as count
            FROM appointments
            GROUP BY doctor_user_id
            HAVING COUNT(*) >= 2
        """))
        
        doctors_with_multiple = result.fetchall()
        
        if doctors_with_multiple:
            print("✅ Doctors with 2+ appointments (can swap):")
            for doctor_id, count in doctors_with_multiple:
                print(f"   Doctor User ID {doctor_id}: {count} appointments")
                
                # Get their appointments
                result = db.execute(text("""
                    SELECT id FROM appointments
                    WHERE doctor_user_id = :doctor_id
                    ORDER BY id
                """), {"doctor_id": doctor_id})
                
                appt_ids = [row[0] for row in result.fetchall()]
                print(f"   Appointment IDs: {appt_ids}")
                print()
        else:
            print("⚠️  No doctor has 2+ appointments")
        
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_appointments()
