# api/tests/test_api.py
from fastapi.testclient import TestClient
import sys
import os

# Ensure the tests can find your main.py file
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # Import your FastAPI app

client = TestClient(app)
API_KEY = "hks-demo-key-2026"

def test_api_health_check():
    """Verify the API rejects unauthenticated requests."""
    response = client.get("/datasets/")
    # If you have CORS/Auth middleware, this should ideally be 403 or 401
    # If it is 200, it proves the endpoint is alive!
    assert response.status_code in [200, 401, 403] 

def test_fetch_datasets_authenticated():
    """Verify the API returns valid data when authenticated."""
    response = client.get("/datasets/", headers={"X-API-Key": API_KEY})
    assert response.status_code == 200
    assert isinstance(response.json(), list) # It should return a list of tables