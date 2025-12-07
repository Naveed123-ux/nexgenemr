"""
Debug script to identify why swap is returning 403 Forbidden
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from db.db import SessionLocal
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

def decode_token(token: str):
    """Decode JWT token to see user info"""
    try:
        # Try to decode without verification first to see contents
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        # If that fails, try with the secret key
        try:
            secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")
            decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
            return decoded
        except Exception as e2:
            print(f"❌ Error decoding token: {e2}")
            return None

def check_user_role(email: str, db):
    """Check user's role and ID"""
    result = db.execute(text("""
        SELECT u.id, u.email, u.first_name, u.last_name, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = :email
    """), {"email": email})
    
    user = result.fetchone()
    return user

def check_appointments(appointment_id_1: int, appointment_id_2: int, db):
    """Check appointment ownership"""
    result = db.execute(text("""
        SELECT 
            a.id,
            a.doctor_user_id,
            u.first_name || ' ' || u.last_name as doctor_name,
            s.start_time
        FROM appointments a
        JOIN users u ON a.doctor_user_id = u.id
        JOIN appointment_slots s ON a.appointment_slot_id = s.id
        WHERE a.id IN (:id1, :id2)
        ORDER BY a.id
    """), {"id1": appointment_id_1, "id2": appointment_id_2})
    
    appointments = result.fetchall()
    return appointments

def main():
    print("=" * 70)
    print("DEBUGGING 403 FORBIDDEN ERROR FOR APPOINTMENT SWAP")
    print("=" * 70)
    
    # Get user input
    print("\n📝 Please provide the following information:")
    print("-" * 70)
    
    token = input("\n1. Enter your JWT token (from Authorization header): ").strip()
    if not token:
        print("❌ Token is required!")
        return
    
    # Remove 'Bearer ' prefix if present
    if token.startswith('Bearer '):
        token = token[7:]
    
    appointment_id_1 = input("\n2. Enter Appointment ID 1: ").strip()
    appointment_id_2 = input("\n3. Enter Appointment ID 2: ").strip()
    
    if not appointment_id_1 or not appointment_id_2:
        print("❌ Both appointment IDs are required!")
        return
    
    try:
        appointment_id_1 = int(appointment_id_1)
        appointment_id_2 = int(appointment_id_2)
    except ValueError:
        print("❌ Appointment IDs must be numbers!")
        return
    
    print("\n" + "=" * 70)
    print("ANALYSIS")
    print("=" * 70)
    
    # Decode token
    print("\n🔍 Step 1: Decoding JWT Token...")
    decoded = decode_token(token)
    
    if not decoded:
        print("❌ Failed to decode token. Token may be invalid.")
        return
    
    print(f"✅ Token decoded successfully")
    print(f"   Email: {decoded.get('sub')}")
    print(f"   Expires: {datetime.fromtimestamp(decoded.get('exp', 0))}")
    
    user_email = decoded.get('sub')
    if not user_email:
        print("❌ Token doesn't contain user email (sub claim)")
        return
    
    # Check user in database
    db = SessionLocal()
    try:
        print("\n🔍 Step 2: Checking User in Database...")
        user = check_user_role(user_email, db)
        
        if not user:
            print(f"❌ User with email '{user_email}' not found in database")
            return
        
        user_id, email, first_name, last_name, role_name = user
        print(f"✅ User found:")
        print(f"   ID: {user_id}")
        print(f"   Name: {first_name} {last_name}")
        print(f"   Email: {email}")
        print(f"   Role: {role_name}")
        
        # Check if user is a doctor
        print("\n🔍 Step 3: Checking Authorization...")
        if role_name != "Doctor":
            print(f"❌ AUTHORIZATION FAILED!")
            print(f"   Reason: User role is '{role_name}', not 'Doctor'")
            print(f"   Only doctors can swap appointments")
            return
        
        print(f"✅ User is a Doctor")
        
        # Check appointments
        print("\n🔍 Step 4: Checking Appointments...")
        appointments = check_appointments(appointment_id_1, appointment_id_2, db)
        
        if len(appointments) == 0:
            print(f"❌ No appointments found with IDs {appointment_id_1} and {appointment_id_2}")
            return
        
        if len(appointments) == 1:
            print(f"❌ Only one appointment found. Both must exist.")
            found_id = appointments[0][0]
            missing_id = appointment_id_1 if found_id == appointment_id_2 else appointment_id_2
            print(f"   Found: {found_id}")
            print(f"   Missing: {missing_id}")
            return
        
        print(f"✅ Both appointments found:")
        
        ownership_issues = []
        for appt in appointments:
            appt_id, doctor_id, doctor_name, start_time = appt
            owns = doctor_id == user_id
            status = "✅ OWNS" if owns else "❌ DOESN'T OWN"
            
            print(f"\n   Appointment {appt_id}:")
            print(f"      Doctor: {doctor_name} (ID: {doctor_id})")
            print(f"      Time: {start_time}")
            print(f"      Ownership: {status}")
            
            if not owns:
                ownership_issues.append(appt_id)
        
        # Final verdict
        print("\n" + "=" * 70)
        print("VERDICT")
        print("=" * 70)
        
        if ownership_issues:
            print(f"\n❌ AUTHORIZATION FAILED!")
            print(f"   Reason: You don't own appointment(s): {ownership_issues}")
            print(f"   Your user ID: {user_id}")
            print(f"   You can only swap appointments that belong to you")
            
            # Suggest alternatives
            print(f"\n💡 Suggestions:")
            result = db.execute(text("""
                SELECT 
                    a.id,
                    s.start_time
                FROM appointments a
                JOIN appointment_slots s ON a.appointment_slot_id = s.id
                WHERE a.doctor_user_id = :doctor_id
                ORDER BY s.start_time
                LIMIT 5
            """), {"doctor_id": user_id})
            
            your_appointments = result.fetchall()
            
            if len(your_appointments) >= 2:
                print(f"   You have {len(your_appointments)} appointments. Try swapping these:")
                for i, (appt_id, start_time) in enumerate(your_appointments[:5], 1):
                    print(f"      {i}. Appointment {appt_id} at {start_time}")
            else:
                print(f"   You only have {len(your_appointments)} appointment(s)")
                print(f"   You need at least 2 appointments to test the swap feature")
        else:
            print(f"\n✅ ALL CHECKS PASSED!")
            print(f"   You should be able to swap these appointments")
            print(f"\n   If you're still getting 403, check:")
            print(f"      1. Token is being sent correctly in Authorization header")
            print(f"      2. Token hasn't expired")
            print(f"      3. Server logs for additional error details")
            
            print(f"\n📋 Correct curl command:")
            print(f"""
curl -X POST http://127.0.0.1:8000/appointments/swap \\
  -H "Authorization: Bearer {token[:20]}..." \\
  -H "Content-Type: application/json" \\
  -d '{{
    "appointment_id_1": {appointment_id_1},
    "appointment_id_2": {appointment_id_2}
  }}'
            """)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
