# Use Python slim image for smaller size
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app

# Create directory for model cache
RUN mkdir -p /app/whisper_models

# Pre-download all Whisper models during build
# This prevents downloads during runtime and reduces startup time
RUN python -c "import whisper; \
    models = ['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']; \
    [whisper.load_model(model, download_root='/app/whisper_models') for model in models]; \
    print('All Whisper models downloaded successfully')"

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
