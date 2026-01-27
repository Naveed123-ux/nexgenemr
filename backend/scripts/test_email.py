import sys
import os

# Add the current directory to sys.path to allow imports from utils
sys.path.append(os.getcwd())

from utils.email_utils import send_welcome_email
from dotenv import load_dotenv

load_dotenv()

def test_email():
    test_recipient = os.getenv("EMAIL_USER") # Sending to yourself for testing
    if not test_recipient:
        print("ERROR: EMAIL_USER not found in .env")
        return

    print(f"🚀 Attempting to send a test email to {test_recipient}...")
    print("Using SMTP_SSL on port 465 (Gmail strategy)...")
    
    try:
        # Using the existing function from your codebase
        send_welcome_email(test_recipient, "TEST_PASSWORD_123")
        print("\n✅ Script finished. Check the console output above for any SMTP errors.")
        print("If you don't see an ERROR, the message was handed off to Gmail successfully.")
    except Exception as e:
        print(f"\n❌ Script failed with an unexpected error: {e}")

if __name__ == "__main__":
    test_email()
