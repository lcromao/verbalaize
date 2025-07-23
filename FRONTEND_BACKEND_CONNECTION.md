# VerbalAIze - Sistema de Transcrição de Áudio

Sistema de transcrição de áudio usando OpenAI Whisper com interface web moderna.

## ✅ Status da Conexão Frontend-Backend

O frontend e backend estão **conectados e funcionando corretamente**!

### Serviços Ativos

- **Frontend (React + Vite)**: http://localhost:3000
- **Backend (FastAPI)**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🏗️ Arquitetura

```
Frontend (React/Vite) ←→ Backend (FastAPI)
    Port 3000              Port 8000
        │                      │
        └──── Proxy ───────────┘
              /api/* → localhost:8000
              /health → localhost:8000
```

## 🚀 Como Executar em Modo Desenvolvimento

### Pré-requisitos

- Python 3.10+
- Node.js 18+
- Conda (recomendado)

### Backend (Terminal 1)

```bash
# Ativar ambiente conda
conda activate verbalaize

# Instalar dependências (primeira vez)
pip install -r requirements.txt

# Executar servidor
cd /Users/lucas/verbalaize
PYTHONPATH=/Users/lucas/verbalaize python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Terminal 2)

```bash
cd /Users/lucas/verbalaize/frontend

# Instalar dependências (primeira vez)
npm install

# Executar servidor de desenvolvimento
npm run dev
```

## 🐳 Como Executar com Docker

```bash
# Parar qualquer container em execução
docker-compose down

# Construir e executar
docker-compose up --build
```

## 🔗 Conexões e Integrações

### Proxy Configuration (Vite)

O frontend está configurado para proxy automático:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
  '/health': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

### CORS Configuration (FastAPI)

O backend permite requisições do frontend:

```python
# app/main.py
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "http://0.0.0.0:3000",
]
```

### API Service (Frontend)

```typescript
// frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://');
```

## 📊 Monitoramento

O frontend inclui um componente `ApiStatus` que monitora automaticamente a saúde da API:

- ✅ **API Online** - Verde
- ❌ **API Offline** - Vermelho
- 🔄 **Verificando...** - Cinza

## 🧪 Testes de Conexão

Execute o script de teste:

```bash
chmod +x test-connection.sh
./test-connection.sh
```

## 📁 Estrutura do Projeto

```
verbalaize/
├── app/                    # Backend FastAPI
│   ├── main.py            # Aplicação principal
│   ├── routes/            # Rotas da API
│   ├── services/          # Serviços (Whisper)
│   └── schemas/           # Schemas Pydantic
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # API service
│   │   ├── hooks/         # React hooks
│   │   └── pages/         # Páginas
│   └── vite.config.ts     # Configuração Vite
├── docker-compose.yml     # Configuração Docker
└── requirements.txt       # Dependências Python
```

## 🔧 Troubleshooting

### Backend não inicia
- Verifique se o ambiente conda está ativo
- Verifique se todas as dependências estão instaladas
- Verifique se a porta 8000 não está em uso

### Frontend não conecta
- Verifique se o backend está rodando
- Verifique os logs do Vite para erros de proxy
- Verifique o componente ApiStatus no header

### Docker não funciona
- Execute `docker-compose down` primeiro
- Execute `docker-compose up --build` para reconstruir

## � Formatos de Áudio Suportados

O sistema agora suporta uma ampla gama de formatos de áudio:

### ✅ Formatos Principais
- **MP3** (audio/mpeg, audio/mp3)
- **M4A** (audio/m4a, audio/x-m4a, audio/mp4a) 
- **WAV** (audio/wav, audio/wave, audio/x-wav)
- **OPUS** (audio/opus, audio/x-opus)
- **OGG** (audio/ogg)

### ✅ Formatos Adicionais
- **FLAC** (audio/flac, audio/x-flac)
- **AAC** (audio/aac, audio/x-aac)
- **WebM** (audio/webm)
- **MP4** (audio/mp4)
- **3GP** (audio/3gpp, audio/3gpp2)
- **AMR** (audio/amr, audio/x-amr)

### 🔧 Validação Inteligente

O sistema usa validação dupla:
1. **Content-Type**: Verifica o MIME type do arquivo
2. **Extensão**: Fallback baseado na extensão do arquivo
3. **Tamanho**: Máximo de 100MB por arquivo

## �🎯 Próximos Passos

1. ✅ Conexão Frontend-Backend estabelecida
2. ✅ Proxy configurado
3. ✅ CORS habilitado
4. ✅ Monitoramento de saúde da API
5. ✅ **Suporte expandido para formatos de áudio**
6. 🔄 Teste de upload de arquivos
7. 🔄 Teste de transcrição em tempo real
8. 🔄 Deploy em produção
