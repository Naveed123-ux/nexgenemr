from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
import os
import base64

load_dotenv()

EMR_ENCRYPTION_KEY = os.getenv("EMR_ENCRYPTION_KEY")

try:
    if not EMR_ENCRYPTION_KEY:
        raise ValueError("EMR_ENCRYPTION_KEY is not set in .env")
    # Ensure the key is valid by checking length and base64 decoding
    decoded_key = base64.b64decode(EMR_ENCRYPTION_KEY)
    if len(decoded_key) != 32:
        raise ValueError("EMR_ENCRYPTION_KEY must be a 32-byte base64-encoded string")
    fernet = Fernet(EMR_ENCRYPTION_KEY.encode())
except (ValueError, InvalidToken) as e:
    raise Exception(f"Invalid encryption key configuration: {str(e)}")

def encrypt_field(value: str) -> str:
    try:
        if not isinstance(value, str):
            raise ValueError("Value to encrypt must be a string")
        return fernet.encrypt(value.encode()).decode()
    except Exception as e:
        raise Exception(f"Encryption error: {str(e)}")

def decrypt_field(value: str) -> str:
    try:
        if not isinstance(value, str):
            raise ValueError("Value to decrypt must be a string")
        return fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        raise Exception("Invalid encryption key or corrupted data")
    except Exception as e:
        raise Exception(f"Decryption error: {str(e)}")