#!/bin/bash

# Script para testar a API de transcrição

echo "=== Teste de Conexão - VerbalAIze ==="
echo ""

echo "1. Testando health check do backend..."
curl -s http://localhost:8000/health | jq '.'
echo ""

echo "2. Testando health check através do proxy do frontend..."
curl -s http://localhost:3000/api/health || echo "Endpoint não encontrado (esperado)"
echo ""

echo "3. Testando endpoint raiz da API..."
curl -s http://localhost:8000/ | jq '.'
echo ""

echo "4. Testando CORS (origem do frontend)..."
curl -s -H "Origin: http://localhost:3000" http://localhost:8000/health | jq '.'
echo ""

echo "=== Teste Concluído ==="
echo ""
echo "✅ Frontend: http://localhost:3000"
echo "✅ Backend: http://localhost:8000" 
echo "✅ Docs da API: http://localhost:8000/docs"
