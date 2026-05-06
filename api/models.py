from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from database import Base
from datetime import datetime

class Dataset(Base):
    """The 'Table' the researcher selects on the frontend."""
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., "Lab_A_Sensors"
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class PullJobConfig(Base):
    """Stores the configuration for automated data pulling."""
    __tablename__ = "pull_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    source_url = Column(String) # Where to pull from
    cron_schedule = Column(String) # e.g., "0 * * * *" for hourly
    is_active = Column(Boolean, default=True)

class RawSensorData(Base):
    __tablename__ = "raw_sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id")) 
    ingested_at = Column(DateTime, default=datetime.utcnow)
    source = Column(String) # "client_push" or "automated_pull"
    raw_payload = Column(JSONB)

class CuratedSensorData(Base):
    __tablename__ = "curated_sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    raw_data_id = Column(Integer, ForeignKey("raw_sensor_data.id"))
    timestamp = Column(DateTime, index=True)
    sensor_id = Column(String, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    location = Column(String)

    # Prevents duplicate records within the same dataset
    __table_args__ = (UniqueConstraint('dataset_id', 'timestamp', 'sensor_id', name='_dataset_time_sensor_uc'),)

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    curated_data_id = Column(Integer, ForeignKey("curated_sensor_data.id"))
    anomaly_type = Column(String)
    confidence_score = Column(Float)
    detected_at = Column(DateTime, default=datetime.utcnow)