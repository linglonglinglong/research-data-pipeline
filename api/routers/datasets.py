from fastapi import APIRouter, Depends, HTTPException
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