from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import models
from database import get_db
from auth import verify_api_key

router = APIRouter(
    prefix="/datasets",
    tags=["Dataset Management"],
    dependencies=[Depends(verify_api_key)]
)

class DatasetCreate(BaseModel):
    name: str
    description: str = None

class PullJobCreate(BaseModel):
    dataset_id: int
    source_url: str
    cron_schedule: str

@router.get("/")
def list_datasets(db: Session = Depends(get_db)):
    """Returns all available datasets for the frontend dropdown."""
    return db.query(models.Dataset).all()

@router.post("/")
def create_dataset(dataset: DatasetCreate, db: Session = Depends(get_db)):
    """Creates a new dataset."""
    db_dataset = models.Dataset(name=dataset.name, description=dataset.description)
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

@router.post("/pull-jobs")
def create_pull_job(job: PullJobCreate, db: Session = Depends(get_db)):
    """Saves the configuration for automated pulling."""
    db_job = models.PullJobConfig(**job.dict())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return {"message": "Pull job configured", "job_id": db_job.id}

@router.get("/pull-jobs")
def get_pull_jobs(db: Session = Depends(get_db)):
    """Fetches all configured automated pull jobs."""
    jobs = db.query(models.PullJobConfig).all()
    return [{
        "id": job.id,
        "dataset_id": job.dataset_id,
        "source_url": job.source_url,
        "cron_schedule": job.cron_schedule, 
        # Using getattr as a safe fallback in case your SQLAlchemy model doesn't explicitly define is_active yet
        "is_active": getattr(job, "is_active", True) 
    } for job in jobs]

@router.get("/{dataset_id}/anomalies")
def get_anomalies(
    dataset_id: int, 
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100), 
    db: Session = Depends(get_db)
):
    """Fetches anomalies and joins them with the original sensor data, with pagination."""
    
    # 1. Build the base query
    base_query = db.query(models.Anomaly, models.CuratedSensorData).join(
        models.CuratedSensorData, models.Anomaly.curated_data_id == models.CuratedSensorData.id
    ).filter(
        models.CuratedSensorData.dataset_id == dataset_id
    )
    
    # 2. Get the total count for the frontend to calculate pages
    total_count = base_query.count()
    
    # 3. Apply offset and limit
    offset = (page - 1) * limit
    results = base_query.order_by(models.Anomaly.confidence_score.desc())\
                        .offset(offset)\
                        .limit(limit)\
                        .all()
    
    # 4. Format the data
    data = [{
        "id": anomaly.id,
        "sensor_id": sensor.sensor_id,
        "location": sensor.location,
        "anomaly_type": anomaly.anomaly_type,
        "confidence_score": round(anomaly.confidence_score, 2),
        "temperature": sensor.temperature,
        "detected_at": anomaly.detected_at.isoformat()
    } for anomaly, sensor in results]
    
    # 5. Return the paginated wrapper
    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "data": data
    }