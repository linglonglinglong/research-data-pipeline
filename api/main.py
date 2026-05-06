from fastapi import FastAPI

app = FastAPI(title="HKS Research Data Pipeline")

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is connected and routing properly!"}