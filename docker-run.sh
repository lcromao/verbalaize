#!/bin/bash

# Script para buildar e rodar o Docker Compose
echo "🐳 Building and starting Docker containers..."

# Para o compose se estiver rodando
docker-compose down

# Rebuilda os containers
docker-compose build --no-cache

# Inicia os serviços
docker-compose up

echo "✅ Docker services started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8000"
echo "💚 Health check: http://localhost:8000/health"
