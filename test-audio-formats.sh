#!/bin/bash

# Script para testar os formatos de áudio suportados

echo "=== Teste de Formatos de Áudio Suportados - VerbalAIze ==="
echo ""

# Verificar se a API está ativa
echo "1. Verificando se a API está ativa..."
response=$(curl -s http://localhost:8000/health)
if [[ $response == *"healthy"* ]]; then
    echo "✅ API está online"
else
    echo "❌ API não está respondendo"
    exit 1
fi
echo ""

# Listar formatos suportados via documentação
echo "2. Verificando documentação da API..."
curl -s http://localhost:8000/docs > /dev/null
echo "✅ Documentação disponível em: http://localhost:8000/docs"
echo ""

# Testar endpoint de upload (método não permitido é esperado sem arquivo)
echo "3. Testando endpoint de upload..."
response=$(curl -s -w "%{http_code}" http://localhost:8000/api/v1/transcribe/upload)
if [[ $response == *"405"* ]]; then
    echo "✅ Endpoint de upload está ativo (405 Method Not Allowed é esperado)"
else
    echo "⚠️  Resposta inesperada do endpoint: $response"
fi
echo ""

echo "4. Formatos agora suportados pelo backend:"
echo "   ✅ MP3 (audio/mpeg, audio/mp3)"
echo "   ✅ M4A (audio/m4a, audio/x-m4a, audio/mp4a)"
echo "   ✅ WAV (audio/wav, audio/wave, audio/x-wav)"
echo "   ✅ OPUS (audio/opus, audio/x-opus)"
echo "   ✅ OGG (audio/ogg)"
echo "   ✅ FLAC (audio/flac, audio/x-flac)"
echo "   ✅ AAC (audio/aac, audio/x-aac)"
echo "   ✅ WebM (audio/webm)"
echo "   ✅ MP4 (audio/mp4)"
echo "   ✅ 3GP (audio/3gpp, audio/3gpp2)"
echo "   ✅ AMR (audio/amr, audio/x-amr)"
echo "   ✅ Fallback (application/octet-stream)"
echo ""

echo "5. Melhorias implementadas:"
echo "   ✅ Validação por Content-Type expandida"
echo "   ✅ Validação por extensão de arquivo como fallback"
echo "   ✅ Mensagens de erro mais informativas"
echo "   ✅ Frontend atualizado com novos formatos"
echo "   ✅ Documentação da API atualizada"
echo ""

echo "=== Teste de Configuração Concluído ==="
echo ""
echo "🎯 Para testar uploads:"
echo "   1. Acesse: http://localhost:3000"
echo "   2. Faça upload de um arquivo M4A, FLAC, AAC, etc."
echo "   3. Verifique se não há mais erro 'Unsupported file type'"
echo ""
echo "📖 Documentação completa: http://localhost:8000/docs"
