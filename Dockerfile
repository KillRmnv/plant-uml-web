# --- Stage 1: Frontend Builder ---
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Copy sc-web submodule and build it
COPY external/sc-web ./external/sc-web
RUN cd external/sc-web && npm install && npm run build

# --- Stage 2: Backend ---
# Using the user's specific Python version
FROM python:3.14-slim

# Install system dependencies for PostgreSQL and building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements-lock first to leverage Docker cache
COPY requirements-lock.txt .

# Copy external libraries needed for installation
COPY external/py-sc-client ./external/py-sc-client
COPY external/py-sc-kpm ./external/py-sc-kpm

# Install fixed dependencies from lock file
RUN pip install --no-cache-dir -r requirements-lock.txt

# Install local libraries as editable (or just install them)
RUN pip install --no-cache-dir ./external/py-sc-client ./external/py-sc-kpm

# Copy the rest of the application code
COPY src ./src
COPY external ./external

# Copy the built static files from the frontend-builder stage
COPY --from=frontend-builder /app/external/sc-web/client/static ./external/sc-web/client/static

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose FastAPI port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
