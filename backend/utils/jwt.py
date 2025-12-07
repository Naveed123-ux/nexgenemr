import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

def create_access_token(data: dict):
    """
    Generates a new access token.
    All configuration is fetched directly from the environment.
    """
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM")
    access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    if not secret_key or not algorithm:
        raise ValueError("SECRET_KEY and ALGORITHM must be set in .env file")

    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt

def create_refresh_token(data: dict):
    """
    Generates a new refresh token.
    All configuration is fetched directly from the environment.
    """
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM")
    refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

    if not secret_key or not algorithm:
        raise ValueError("SECRET_KEY and ALGORITHM must be set in .env file")

    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=refresh_token_expire_days)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    """
    Verifies the integrity and expiration of a token.
    Secrets are fetched directly from the environment.
    Returns the entire payload on success.
    """
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM")
    if not secret_key or not algorithm:
        raise ValueError("SECRET_KEY and ALGORITHM must be set in .env file")

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError:
        raise credentials_exception
