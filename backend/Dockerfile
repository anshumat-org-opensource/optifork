# Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application.
# Worker count is configurable via API_WORKERS (default 1 for backward-compatible,
# SQLite-safe behaviour). Phase 2 showed a single worker is the flag-eval p99
# bottleneck under load (per-request work is only ~4-6 ms); set API_WORKERS to the
# host's core count on a Postgres deployment (the compose files do). See SCALE_REPORT.md.
# NOTE: with >1 worker, use Postgres — SQLite serialises writers and the per-request
# exposure INSERT will lock.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${API_WORKERS:-1}"]