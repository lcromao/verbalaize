# Verbalaize

Serviço de transcrição de áudio usando OpenAI Whisper. O backend é construído com FastAPI e o frontend com React e TypeScript.

## Requisitos

**Para rodar com Docker:**
- Docker Desktop com 8 GB+ de RAM alocados (Settings > Resources > Memory)
- 5 GB de espaço livre em disco

**Para rodar localmente:**
- Python 3.8+
- Node.js 18+

## Estrutura do projeto

```
verbalaize/
├── app/                        # Backend (FastAPI)
│   ├── main.py
│   ├── core/config.py
│   ├── schemas/transcription.py
│   ├── services/whisper_service.py
│   ├── routes/transcription.py
│   └── tests/
├── frontend/                   # Frontend (React + TypeScript)
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── services/
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Rodando com Docker

```bash
git clone <repository-url>
cd verbalaize

# Sobe os containers (backend + frontend)
bash up.sh

# Para derrubar
bash down.sh
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

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
python -m app.main
```

O servidor inicia em http://localhost:8000. Na primeira inicializacao o modelo Whisper turbo e baixado automaticamente (~1.5 GB).

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
POST /api/v1/transcribe/upload
Content-Type: multipart/form-data

Campos:
  file            Arquivo de audio (MP3, M4A, WAV, OGG, OPUS, FLAC, AAC, WebM)
  model           "small" | "medium" | "turbo"
  action          "transcribe" | "translate_english"
  target_language Codigo do idioma (opcional, para traducao)
```

### Transcricao em tempo real

```
WebSocket: /api/v1/transcribe/realtime

Mensagem de configuracao (JSON):
  { "type": "config", "model": "turbo", "action": "transcribe", "target_language": null }

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
```

### Backend

```bash
python -m app.main  # Desenvolvimento (com reload automatico)
pytest              # Executar testes
```

## Resolucao de problemas

**Container sai com codigo 137 (Out of Memory)**
O Docker nao tem memoria suficiente. Acesse Docker Desktop > Settings > Resources > Memory e aumente para 8 GB ou mais.

**Frontend nao conecta ao backend**
Verifique se o backend esta rodando em `http://localhost:8000`. Em modo de desenvolvimento o Vite faz proxy automatico das chamadas `/api` e `/health` para o backend.

**Modelo Whisper nao carrega**
Verifique se ha espaco em disco suficiente e conexao com a internet na primeira execucao. Os modelos sao salvos em `./whisper_models/`.
