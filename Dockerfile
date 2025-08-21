# Stage 1: Build the frontend
FROM node:20-alpine AS builder-frontend

WORKDIR /app/frontend

# Copy package manifests and install dependencies
COPY frontend/package.json frontend/bun.lockb* ./
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ .

# Build the frontend
# Ensure missing utils.ts exists (idempotent) before building
RUN mkdir -p src/lib \
    && printf "import { type ClassValue, clsx } from \"clsx\"\nimport { twMerge } from \"tailwind-merge\"\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}\n" > src/lib/utils.ts \
    && npm run build

# Stage 2: Build the final image with backend and frontend artifacts
FROM python:3.10-slim AS final

# Install ffmpeg, a dependency for Whisper
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create the directory for Whisper models
RUN mkdir -p /app/whisper_models

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY app/ ./app

# Copy the built frontend from the builder stage
COPY --from=builder-frontend /app/frontend/dist ./frontend/dist

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application - FIXED: use 0.0.0.0 instead of 127.0.0.1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
