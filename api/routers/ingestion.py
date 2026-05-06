import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models
from database import get_db
from auth import verify_api_key
from scripts.anomaly_detector import AnomalyDetector

router = APIRouter(
    prefix="/ingest",
    tags=["Pipeline Ingestion"],
    dependencies=[Depends(verify_api_key)]
)

def process_pipeline(dataset_id: int, payload: List[Dict[str, Any]], source: str, db: Session):
    """Core ELT logic shared by all ingestion methods."""
    # 1. Save to Raw Data Table
    raw_record = models.RawSensorData(
        dataset_id=dataset_id,
        source=source,
        raw_payload=payload
    )
    db.add(raw_record)
    db.commit()
    db.refresh(raw_record)

    # 2. Curate Data
    curated_records = []
    for item in payload:
        curated = models.CuratedSensorData(
            dataset_id=dataset_id,
            raw_data_id=raw_record.id,
            timestamp=datetime.fromisoformat(str(item['timestamp']).replace('Z', '+00:00')),
            sensor_id=str(item['sensor_id']),
            temperature=float(item['temperature']) if pd.notnull(item.get('temperature')) else None,
            humidity=float(item['humidity']) if pd.notnull(item.get('humidity')) else None,
            pressure=float(item['pressure']) if pd.notnull(item.get('pressure')) else None,
            location=str(item.get('location', ''))
        )
        db.add(curated)
        try:
            db.commit()
            db.refresh(curated)
            curated_records.append(curated)
        except IntegrityError:
            db.rollback() 
            continue

    # 3. Anomaly Detection
    curated_dicts = [{
        "id": c.id, "sensor_id": c.sensor_id, "timestamp": c.timestamp.isoformat(),
        "temperature": c.temperature, "humidity": c.humidity, "pressure": c.pressure
    } for c in curated_records]

    if curated_dicts:
        detector = AnomalyDetector()
        anomalies = detector.detect_anomalies(curated_dicts)
        
        db_anomalies = [models.Anomaly(
            # Cast the NumPy variables to pure Python types here!
            curated_data_id=int(a['sensor_data_id']),
            anomaly_type=str(a['anomaly_type']),
            confidence_score=float(a['confidence_score'])
        ) for a in anomalies]
        
        db.add_all(db_anomalies)
        db.commit()

    return {"raw_records_received": len(payload), "curated_records_inserted": len(curated_records)}

@router.post("/{dataset_id}/push")
def ingest_json_push(dataset_id: int, payload: List[Dict[str, Any]], db: Session = Depends(get_db)):
    """Ingests a JSON array directly."""
    try:
        result = process_pipeline(dataset_id, payload, "client_json_push", db)
        return {"message": "JSON ingestion successful", **result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{dataset_id}/upload")
def ingest_csv_upload(dataset_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Ingests data via a direct CSV file upload."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
        
    try:
        # Read the uploaded file directly into memory using Pandas
        df = pd.read_csv(file.file)
        
        # Convert the dataframe to a list of dictionaries 
        payload = df.to_dict(orient="records")
        
        # Hand it off to the exact same pipeline logic
        result = process_pipeline(dataset_id, payload, f"csv_upload_{file.filename}", db)
        return {"message": f"CSV upload successful ({file.filename})", **result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@router.post("/pull/{job_id}")
def simulate_pull_job(job_id: int, db: Session = Depends(get_db)):
    """Simulates a cron job pulling data. SIMULATION ONLY - In production, this would be triggered by an actual scheduler like CloudWatch."""
    job = db.query(models.PullJobConfig).filter(models.PullJobConfig.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    try:
        df = pd.read_csv("sample_data.csv")
        payload = df.to_dict(orient="records")
        
        result = process_pipeline(job.dataset_id, payload, f"automated_pull_job_{job_id}", db)
        return {"message": "Pull job executed successfully", **result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))