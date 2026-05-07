from fastapi import APIRouter, Depends, Query
from datetime import datetime, time
from typing import Optional
from sqlalchemy import and_
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
    sensor_id: Optional[str] = Query(None), 
    start_date: Optional[datetime] = Query(None), 
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100), 
    db: Session = Depends(get_db)
):
    """
    Executes a filtered SQL query to retrieve anomalies by sensor and date range.
    """
    # 1. Initialize the SQL query with Joins
    # This represents: SELECT * FROM anomalies JOIN curated_sensor_data ...
    query = db.query(models.Anomaly, models.CuratedSensorData).join(
        models.CuratedSensorData, 
        models.Anomaly.curated_data_id == models.CuratedSensorData.id
    ).filter(models.CuratedSensorData.dataset_id == dataset_id)

    # 2. Build the WHERE clause dynamically based on SQL requirements
    filters = []
    if sensor_id:
        filters.append(models.CuratedSensorData.sensor_id == sensor_id)
    if start_date:
        start_of_day = datetime.combine(start_date.date(), time.min)
        filters.append(models.Anomaly.detected_at >= start_of_day)
    if end_date:
        end_of_day = datetime.combine(end_date.date(), time.max)
        filters.append(models.Anomaly.detected_at <= end_of_day)

    if filters:
        # Applies the SQL 'AND' operator to all active filters
        query = query.filter(and_(*filters))

    # 3. Calculate total for pagination (Executed as SELECT COUNT(*)...)
    total_count = query.count()

    # 4. Apply ORDER BY, LIMIT, and OFFSET for the final SQL execution
    offset = (page - 1) * limit
    results = query.order_by(models.Anomaly.confidence_score.desc())\
                   .offset(offset)\
                   .limit(limit)\
                   .all()

    # 5. Serialization for Frontend
    data = [{
        "id": anomaly.id,
        "sensor_id": sensor.sensor_id,
        "location": sensor.location,
        "anomaly_type": anomaly.anomaly_type,
        "confidence_score": round(anomaly.confidence_score, 2),
        "temperature": sensor.temperature,
        "detected_at": anomaly.detected_at.strftime("%Y-%m-%dT%H:%M:%S.%f")
    } for anomaly, sensor in results]

    return {
        "total": total_count,
        "page": page,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "data": data
    }