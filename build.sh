#!/bin/bash

# Build script for Verbalaize with pre-downloaded Whisper models
# This script builds the Docker images with all Whisper models pre-downloaded

set -e

echo "🚀 Building Verbalaize with pre-downloaded Whisper models..."
echo "This may take 10-15 minutes for the first build (downloading ~6GB of models)"
echo ""

# Check available disk space
echo "📊 Checking disk space..."
available_space=$(df -h . | awk 'NR==2 {print $4}')
echo "Available space: $available_space"
echo ""

# Build backend with model downloads
echo "🔧 Building backend (this will download all Whisper models)..."
echo "Models to be downloaded:"
#echo "  - tiny    (~39 MB)"
#echo "  - base    (~142 MB)" 
echo "  - small   (~461 MB)"
echo "  - medium  (~1.42 GB)"
#echo "  - large-v2 (~2.87 GB)"
echo "  - large-v3 (~2.87 GB)"
echo "  Total: ~8GB"
echo ""

docker-compose build backend

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
