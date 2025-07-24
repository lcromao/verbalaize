#!/bin/bash

# Build script for Verbalaize with pre-downloaded Whisper models
# This script builds the Docker images with all Whisper models pre-downloaded

set -e

echo "🚀 Building Verbalaize with pre-downloaded Whisper models..."
echo "⏱️  This will take 10-15 minutes on first run (downloads ~4.7GB of models)"
echo "💾 Requires at least 8GB RAM for Docker to prevent build failures"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check Docker memory allocation (if available)
echo "💾 Checking Docker memory allocation..."
DOCKER_MEMORY_INFO=$(docker system info 2>/dev/null | grep -i "total memory" || echo "Memory info not available")
echo "   $DOCKER_MEMORY_INFO"
echo "   💡 Recommended: At least 8GB for model downloads"
echo "   🔧 Fix if needed: Docker Desktop → Settings → Resources → Memory → 8GB+"
echo ""

# Check available disk space
echo "📊 Checking disk space..."
available_space=$(df -h . | awk 'NR==2 {print $4}')
echo "Available space: $available_space"
echo ""

echo "🧹 Cleaning up previous builds..."
docker-compose down --volumes --remove-orphans 2>/dev/null || true

echo ""
echo "🔧 Building backend (downloading Whisper models separately)..."
echo "Models to be downloaded:"
echo "  - small   (~461 MB)"
echo "  - medium  (~1.42 GB)"
echo "  - large-v3 (~2.88 GB)"
echo "  Total: ~4.7GB"
echo ""
echo "💡 Each model downloads separately to prevent memory issues"
echo ""

# Build backend with increased memory limits
docker-compose build backend

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Backend build failed!"
    echo ""
    echo "🔧 Common solutions:"
    echo "   1. Increase Docker memory: Docker Desktop → Settings → Resources → Memory → 8GB+"
    echo "   2. Close other applications to free RAM"
    echo "   3. Restart Docker Desktop"
    echo "   4. Use local development instead (see README Option 2)"
    exit 1
fi

echo ""
echo "🎨 Building frontend..."
docker-compose build frontend

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo ""
echo "🎨 Building frontend..."
docker-compose build frontend

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Run: docker-compose up"
echo "  2. Access: http://localhost:3000 (frontend)"
echo "  3. API docs: http://localhost:8000/docs"
echo ""
echo "💡 All Whisper models are now pre-downloaded and cached!"
echo "   First transcription will be much faster."
