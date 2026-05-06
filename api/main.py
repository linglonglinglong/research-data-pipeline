from fastapi import FastAPI
import models
from database import engine
from routers import generation, ingestion, datasets

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HKS Research Data Pipeline")

# Connect the modular routers
app.include_router(generation.router)
app.include_router(ingestion.router)
app.include_router(datasets.router)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "architecture": "Modular APIRouter ELT"}