from fastapi import FastAPI
import models
from database import engine
from routers import generation, ingestion, datasets
from fastapi.middleware.cors import CORSMiddleware

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HKS Research Data Pipeline")

# Add the CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the local Docker demo
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, OPTIONS)
    allow_headers=["*"], # Allow all headers (X-API-Key, Content-Type)
)
# Connect the modular routers
app.include_router(generation.router)
app.include_router(ingestion.router)
app.include_router(datasets.router)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "architecture": "Modular APIRouter ELT"}