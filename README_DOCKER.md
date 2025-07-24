# 🎤 Verbalaize - Audio Transcription Service

Sistema completo de transcrição de áudio usando OpenAI Whisper com interface web moderna.

## 🚀 Setup Rápido com Docker (Recomendado)

### Pré-requisitos
- Docker Desktop
- Git
- **8GB de espaço livre** (para modelos Whisper)
- **4GB RAM** mínimo recomendado

### 1. Clone e Build
```bash
git clone <url-do-repositorio>
cd verbalaize

# Build otimizado (baixa todos os modelos durante o build)
./build.sh
```

### 2. Execute a aplicação
```bash
docker-compose up
```

### 3. Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs

## 🔧 Recursos

### Modelos Whisper Disponíveis
- **tiny** - Ultra rápido, menor precisão (~39MB)
- **base** - Rápido, boa precisão (~142MB)
- **small** - Equilibrado (~461MB)
- **medium** - Alta precisão (~1.4GB) 
- **large-v2** - Máxima precisão (~2.9GB)
- **turbo** - Otimizado para velocidade (mapeado para large-v3)

### Ações Suportadas
- **Transcrever** - Converte áudio em texto no idioma original
- **Traduzir para Inglês** - Transcreve e traduz para inglês
- **Traduzir para outro idioma** - Em desenvolvimento

### Formatos de Áudio Suportados
MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR

## 📁 Estrutura do Projeto

```
verbalaize/
├── 🐳 docker-compose.yml       # Orquestração dos containers
├── 🐳 Dockerfile              # Container do backend Python
├── 📦 requirements.txt        # Dependências Python
├── 🚀 build.sh               # Script de build otimizado
├── 🧪 test-connection.sh      # Teste de conectividade
│
├── 🔧 app/                    # Backend FastAPI
│   ├── main.py               # Aplicação principal
│   ├── core/config.py        # Configurações
│   ├── routes/               # Endpoints da API
│   ├── services/             # Serviços (Whisper)
│   └── schemas/              # Modelos de dados
│
└── 🎨 frontend/              # Frontend React + Vite
    ├── 🐳 Dockerfile
    ├── src/
    │   ├── components/       # Componentes React
    │   ├── pages/           # Páginas da aplicação
    │   ├── services/        # Comunicação com API
    │   └── lib/utils.ts     # Utilitários (shadcn/ui)
    └── package.json
```

## 🔧 Desenvolvimento

### Backend (FastAPI)
```bash
cd app
pip install -r ../requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## 🐛 Solução de Problemas

### Erro de Import "@/lib/utils"
```bash
cd frontend
./fix-imports.sh  # Converte para imports relativos
```

### Container sai com código 137
- **Causa**: Falta de memória durante download dos modelos
- **Solução**: Use `./build.sh` que pré-baixa os modelos durante o build

### Modelos não carregam
```bash
# Verificar se o volume existe
docker volume ls | grep whisper

# Rebuild forçado
docker-compose down -v
./build.sh
docker-compose up
```

## 🎯 Otimizações

### Modelos Pré-baixados
✅ Todos os modelos Whisper são baixados durante o **build**  
✅ Startup em segundos (não minutos)  
✅ Primeira transcrição instantânea  
✅ Cache persistente entre restarts  

### Performance
- **Async/await** para operações não-bloqueantes
- **Model caching** com locks para concorrência
- **Chunked uploads** para arquivos grandes
- **Health checks** otimizados

## 📊 Monitoramento

### Health Checks
- Backend: http://localhost:8000/health
- Container status: `docker-compose ps`
- Logs: `docker-compose logs -f backend`

### Teste de Conectividade
```bash
./test-connection.sh
```

## 🔒 Configuração de Produção

Para produção, considere:
- Configurar variáveis de ambiente adequadas
- Usar proxy reverso (nginx)
- Configurar SSL/TLS
- Implementar rate limiting
- Configurar logging centralizado

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.
