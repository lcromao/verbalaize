# Verbalaize

Serviço de transcrição de áudio usando OpenAI Whisper. O backend é construído com FastAPI e o frontend com React e TypeScript.

## Requisitos

**Para rodar com Docker:**
- Docker Desktop com 8 GB+ de RAM alocados (Settings > Resources > Memory)
- 5 GB de espaço livre em disco

**Para rodar localmente:**
- Python 3.8+
- Node.js 18+
- FFmpeg instalado no sistema e disponivel no `PATH`

## Estrutura do projeto

```
verbalaize/
├── app/                        # Backend (FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── main.py
│   ├── core/config.py
│   ├── schemas/transcription.py
│   ├── services/whisper_service.py
│   ├── routes/transcription.py
│   └── tests/
├── frontend/                   # Frontend (React + TypeScript)
│   ├── Dockerfile
│   └── src/
│      ├── components/
│      ├── hooks/
│      ├── pages/
│      └── services/
├── docker-compose.yml
├── scripts.sh
├── up.sh
└── down.sh
```

## Rodando com Docker

```bash
git clone <repository-url>
cd verbalaize

# Sobe os containers
./scripts.sh docker-up

# Para derrubar
./scripts.sh docker-down
```

Na primeira execução o Docker baixa os modelos Whisper (~1.5 GB para o turbo). As execucoes seguintes usam o cache e iniciam em segundos.

Acessos:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Documentacao interativa: http://localhost:8000/docs

## Rodando localmente

### Backend

```bash
# Criar e ativar ambiente virtual
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Garantir que o ffmpeg esteja disponivel no PATH
ffmpeg -version

# Instalar dependencias
pip install -r app/requirements.txt

# Iniciar servidor
python -m app.main
```

O servidor inicia em http://127.0.0.1:8000. Na primeira inicializacao o modelo Whisper turbo e baixado automaticamente (~1.5 GB).

Observacoes:
- O backend nao serve mais o `frontend/dist` por padrao.
- Em desenvolvimento local, o backend escuta apenas em `127.0.0.1` por padrao para evitar exposicao acidental na rede.
- Em desenvolvimento local, o frontend deve ser executado separadamente com `npm run dev`.
- Se quiser reativar o serving estatico do build do frontend pelo backend, defina `VBZ_SERVE_FRONTEND_DIST=true`.
- Se quiser expor o backend em todas as interfaces, defina `VBZ_HOST=0.0.0.0`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend inicia em http://localhost:3000 e conecta ao backend via proxy configurado no `vite.config.ts`.

## API

### Upload de arquivo

```
### Upload de arquivo

```
POST /api/v1/transcribe/upload
Content-Type: multipart/form-data

Campos:
  file            Arquivo de audio (MP3, M4A, WAV, OGG, OPUS, FLAC, AAC, WebM)
  model           "small" | "medium" | "turbo"
  action          "transcribe" | "translate_english"
```

### Transcricao em tempo real

```
### Transcricao em tempo real

```
WebSocket: /api/v1/transcribe/realtime

Mensagem de configuracao (JSON):
  { "type": "config", "model": "turbo", "action": "transcribe" }

Apos configurado, envie chunks de audio como dados binarios.
```

### Health check

```
GET /health
GET /api/health
```

## Modelos disponíveis

| Modelo | Velocidade | Qualidade | VRAM |
|--------|-----------|-----------|------|
| small  | rapido    | boa       | ~1 GB |
| medium | moderado  | otima     | ~5 GB |
| turbo  | rapido    | otima     | ~6 GB |

O modelo `turbo` e carregado no startup da aplicacao. Os demais sao carregados sob demanda e mantidos em cache.

## Comandos uteis

### Frontend


```bash
cd frontend
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de producao
npm run lint       # Verificar codigo
npm run typecheck  # Verificacao de tipos
npm run verify     # lint + typecheck + build
```

### Backend

```bash
python -m app.main  # Desenvolvimento (com reload automatico)
make test-backend   # Suite rapida do backend
make test-backend-audio  # Smoke com audio real
make test-integration    # Frontend + backend como processos reais
make verify         # Backend rapido + frontend
```

### Docker

```bash
./scripts.sh docker-build
./scripts.sh docker-up
./scripts.sh docker-down
./scripts.sh docker-ps
./scripts.sh docker-logs
./scripts.sh docker-logs app
```

## Resolucao de problemas

**Container sai com codigo 137 (Out of Memory)**
O Docker nao tem memoria suficiente. Acesse Docker Desktop > Settings > Resources > Memory e aumente para 8 GB ou mais.

**Frontend nao conecta ao backend**
Verifique se o backend esta rodando em `http://localhost:8000`. Em modo de desenvolvimento o Vite faz proxy automatico das chamadas `/api` e `/health` para o backend.

**Modelo Whisper nao carrega**
Verifique se ha espaco em disco suficiente e conexao com a internet na primeira execucao. Os modelos sao salvos em `./.whisper_models/`.

**Erro informando que `ffmpeg` nao foi encontrado**
Instale o `ffmpeg` no sistema e confirme que o binario esta acessivel no `PATH` com `ffmpeg -version`.

**Backend sobe, mas nao serve o frontend**
Esse comportamento e esperado no modo atual. O frontend roda como processo separado em desenvolvimento e como servico separado no `docker-compose.yml`. Se precisar servir `frontend/dist` pelo backend, defina `VBZ_SERVE_FRONTEND_DIST=true`.
