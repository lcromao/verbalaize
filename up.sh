#!/bin/zsh
set -e
cd "$(dirname "$0")"

# Tenta subir; se falhar (ex.: imagem não existe), faz build e tenta de novo
if ! /usr/local/bin/docker compose up -d; then
  echo "[info] Imagem não encontrada. Construindo e subindo..."
  /usr/local/bin/docker compose up -d --build
fi

sleep 3 # Espera o serviço iniciar

echo "Verbalaize está rodando! Acesse http://localhost:8000"

# 🔗 Abre o link no Chrome
open -a "Google Chrome" http://localhost:8000