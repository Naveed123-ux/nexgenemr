"""
Quick check for swap authorization issues
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from db.db import SessionLocal

def main():
    print("=" * 70)
    print("QUICK SWAP AUTHORIZATION CHECK")
    print("=" * 70)
    
    # Your token shows email: huzaifawoltrio@gmail.com
    user_email = "huzaifawoltrio@gmail.com"
    appointment_id_1 = 37
    appointment_id_2 = 38
    
    db = SessionLocal()
    try:
        # Check user
        print(f"\n🔍 Checking user: {user_email}")
        result = db.execute(text("""
            SELECT u.id, u.email, u.first_name, u.last_name, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = :email
        """), {"email": user_email})
        
        user = result.fetchone()
        
        if not user:
            print(f"❌ User not found!")
            return
        
        user_id, email, first_name, last_name, role_name = user
        print(f"✅ User found:")
        print(f"   ID: {user_id}")
        print(f"   Name: {first_name} {last_name}")
        print(f"   Role: {role_name}")
        
        if role_name != "Doctor":
            print(f"\n❌ PROBLEM: User role is '{role_name}', not 'Doctor'")
            print(f"   Only doctors can swap appointments")
            return
        
        print(f"✅ User is a Doctor")
        
        # Check appointments
        print(f"\n🔍 Checking appointments {appointment_id_1} and {appointment_id_2}...")
        result = db.execute(text("""
            SELECT 
                a.id,
                a.doctor_user_id,
                u.first_name || ' ' || u.last_name as doctor_name,
                p.first_name || ' ' || p.last_name as patient_name,
                s.start_time,
                a.is_telehealth
            FROM appointments a
            JOIN users u ON a.doctor_user_id = u.id
            JOIN patient_profiles pp ON a.patient_profile_id = pp.id
            JOIN users p ON pp.user_id = p.id
            JOIN appointment_slots s ON a.appointment_slot_id = s.id
            WHERE a.id IN (:id1, :id2)
            ORDER BY a.id
        """), {"id1": appointment_id_1, "id2": appointment_id_2})
        
        appointments = result.fetchall()
        
        if len(appointments) == 0:
            print(f"❌ No appointments found!")
            return
        
        if len(appointments) == 1:
            print(f"❌ Only found 1 appointment. Both must exist.")
            print(f"   Found: {appointments[0][0]}")
            missing = appointment_id_1 if appointments[0][0] == appointment_id_2 else appointment_id_2
            print(f"   Missing: {missing}")
            return
        
        print(f"✅ Both appointments found\n")
        
        ownership_issues = []
        for appt in appointments:
            appt_id, doctor_id, doctor_name, patient_name, start_time, telehealth = appt
            owns = doctor_id == user_id
            
            print(f"Appointment {appt_id}:")
            print(f"   Patient: {patient_name}")
            print(f"   Doctor: {doctor_name} (ID: {doctor_id})")
            print(f"   Time: {start_time}")
            print(f"   Telehealth: {telehealth}")
            
            if owns:
                print(f"   ✅ YOU OWN THIS")
            else:
                print(f"   ❌ YOU DON'T OWN THIS (belongs to doctor ID {doctor_id})")
                ownership_issues.append(appt_id)
            print()
        
        # Verdict
        print("=" * 70)
        if ownership_issues:
            print(f"❌ AUTHORIZATION WILL FAIL")
            print(f"   You don't own appointment(s): {ownership_issues}")
            print(f"   Your user ID: {user_id}")
            
            # Find your appointments
            print(f"\n💡 Your appointments:")
            result = db.execute(text("""
                SELECT 
                    a.id,
                    p.first_name || ' ' || p.last_name as patient_name,
                    s.start_time
                FROM appointments a
                JOIN patient_profiles pp ON a.patient_profile_id = pp.id
                JOIN users p ON pp.user_id = p.id
                JOIN appointment_slots s ON a.appointment_slot_id = s.id
                WHERE a.doctor_user_id = :doctor_id
                ORDER BY s.start_time
            """), {"doctor_id": user_id})
            
            your_appointments = result.fetchall()
            
            if len(your_appointments) >= 2:
                print(f"   You have {len(your_appointments)} appointments. Try these IDs:")
                for appt_id, patient_name, start_time in your_appointments:
                    print(f"      - ID {appt_id}: {patient_name} at {start_time}")
            else:
                print(f"   You only have {len(your_appointments)} appointment(s)")
                print(f"   Need at least 2 to test swap")
        else:
            print(f"✅ ALL CHECKS PASSED!")
            print(f"   You should be able to swap these appointments")
            print(f"\n   Correct request:")
            print(f"""
POST http://127.0.0.1:8000/appointments/swap
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{{
  "appointment_id_1": {appointment_id_1},
  "appointment_id_2": {appointment_id_2}
}}
            """)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
