import os
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

# Define the security scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Middleware to verify the API key provided in the request headers.
    """
    expected_key = os.getenv("API_SECRET_KEY", "hks-demo-key-2026")
    
    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid or missing API Key. Authentication failed.")
    
    return "authorized_service"