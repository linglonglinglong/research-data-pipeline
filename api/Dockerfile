# /api/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for compiling some Python packages (like psycopg2)
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the backend port
EXPOSE 8000

# Run the FastAPI server with hot-reloading
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]