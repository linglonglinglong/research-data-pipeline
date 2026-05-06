import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Pull the connection string from Docker environment variables
# Fallback to localhost if you run this script outside of Docker
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://hks_user:hks_password@localhost:5432/sensor_data"
)

# Establish the core engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our models to inherit from
Base = declarative_base()

# Dependency to yield database sessions for our API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()