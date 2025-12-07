import os
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
from datetime import datetime
from google.auth.exceptions import RefreshError

load_dotenv()

CLIENT_SECRETS_FILE = 'client_secret.json'
SCOPES = ['https://www.googleapis.com/auth/calendar.events']
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

def create_client_secrets_file():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("Google client credentials not found in .env file.")
    client_secrets = {
        "web": {
            "client_id": client_id, "project_id": "emr-telehealth-integration",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret, "redirect_uris": [REDIRECT_URI]
        }
    }
    with open(CLIENT_SECRETS_FILE, 'w') as f:
        import json
        json.dump(client_secrets, f)

def get_google_auth_flow():
    create_client_secrets_file()
    return Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI)

def get_authorization_url(state: str):
    flow = get_google_auth_flow()
    authorization_url, _ = flow.authorization_url(access_type='offline', prompt='consent', state=state)
    return authorization_url

def exchange_code_for_tokens(code: str):
    flow = get_google_auth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    if os.path.exists(CLIENT_SECRETS_FILE):
        os.remove(CLIENT_SECRETS_FILE)
    return {
        'token': credentials.token, 'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri, 'client_id': credentials.client_id,
        'client_secret': credentials.client_secret, 'scopes': credentials.scopes
    }

def create_calendar_event(refresh_token: str, summary: str, start_time: datetime, end_time: datetime, attendees: list):
    """
    Creates a Google Calendar event with a Google Meet link.
    """
    print("\n--- 🗓️ [Google Calendar Util] ---")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    print(f"🔑 Received refresh token: '{refresh_token[:15]}...'")
    print(f"🆔 Using Client ID: '{client_id[:15]}...'")
    print(f"🤫 Using Client Secret: '{client_secret[:15]}...'")
    
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES
    )

    try:
        print("🛠️ Building Google Calendar service...")
        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': summary,
            'start': {'dateTime': start_time.isoformat() + 'Z', 'timeZone': 'UTC'},
            'end': {'dateTime': end_time.isoformat() + 'Z', 'timeZone': 'UTC'},
            'attendees': [{'email': email} for email in attendees],
            'conferenceData': {
                'createRequest': {
                    'requestId': f"{start_time.isoformat()}-{summary}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            },
            'reminders': {'useDefault': True},
        }

        print("➕ Inserting event into primary calendar...")
        created_event = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
        print("✅ Event created successfully!")
        return created_event.get('hangoutLink')
    except RefreshError as e:
        print(f"❌ ERROR: Refresh token is invalid or expired (invalid_grant). Details: {e}")
        return None
    except Exception as e:
        print(f"❌ ERROR: A general error occurred while creating the Google Calendar event: {e}")
        return None