import os
import subprocess
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from auth import verify_api_key

router = APIRouter(
    tags=["Testing & Generation"],
    dependencies=[Depends(verify_api_key)]
)

@router.post("/generate-test-data")
def generate_data(
    # Must be greater than 0, and let's cap it at 100,000 to prevent server crashes
    observations: int = Query(default=1000, gt=0, le=100000), 
    
    # Must be a percentage between 0.0 (0%) and 1.0 (100%)
    anomaly_rate: float = Query(default=0.03, ge=0.0, le=1.0) 
):
    """Utility endpoint that generates and returns the CSV file."""
    csv_path = "sample_data.csv"
    try:
        subprocess.run([
            "python", "scripts/generate_data.py", 
            "-n", str(observations), 
            "--anomaly-rate", str(anomaly_rate), 
            "-o", csv_path
        ], check=True)
        
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=500, detail="File generation failed")
            
        return FileResponse(
            path=csv_path, 
            filename="hks_sensor_data.csv", 
            media_type="text/csv"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))