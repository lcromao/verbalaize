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

## Plano de estabilizacao

O objetivo da proxima etapa e reduzir bugs e divida tecnica sem quebrar o fluxo que ja funciona em desenvolvimento:

- Backend sobe com `python -m app.main`
- Frontend sobe com `cd frontend && npm run dev`
- Frontend e backend continuam integrados via `/health`, `/api` e `/api/v1/transcribe/*`

### Fase 1 - Congelar a linha de base

Antes de qualquer refactor, a aplicacao precisa continuar validando estes smokes:

```bash
# Backend
python -m app.main

# Frontend
cd frontend
npm run dev
```

Validacoes minimas da linha de base:

- `GET /health` responde `200`
- `GET /api/health` responde `200`
- `GET http://localhost:3000/health` responde `200` via proxy do Vite
- Upload de um audio real continua funcionando

### Fase 2 - Bateria de testes do backend

Os testes do backend ficam separados por velocidade e escopo:

1. Testes rapidos:
   - configuracao
   - rotas HTTP
   - validacao de payload
   - servico com mocks
   - WebSocket com mocks
2. Smoke com audio real:
   - upload do arquivo `.opus` na raiz do projeto
   - execucao real do pipeline de transcricao
3. Integracao local:
   - backend rodando como processo real
   - frontend rodando como processo real
   - upload passando pelo proxy do frontend

Comandos:

```bash
make test-backend
make test-backend-audio
make test-integration
```

### Fase 3 - Bateria de testes do frontend

O frontend precisa de um gate proprio, separado do backend:

1. `lint`
2. `typecheck`
3. `build`
4. smoke de integracao via proxy com o backend real

Comando:

```bash
make test-frontend
```

### Fase 4 - Ordem de correcao

As correcoes devem seguir esta prioridade:

1. Confiabilidade de startup e configuracao
2. Contratos backend/frontend
3. Upload e resposta de erro
4. Fluxo de transcricao em tempo real
5. Cobertura de testes e eliminacao de falsos positivos
6. Limpeza de README, scripts e convencoes operacionais

### Fase 5 - Criterios de aceite

Nenhuma mudanca deve ser considerada segura sem passar por estes checks:

```bash
make test-backend
make test-frontend
```

Checks adicionais quando o runtime completo do Whisper estiver disponivel:

```bash
make test-backend-audio
make test-integration
```

Aceite minimo por entrega:

- `python -m app.main` continua subindo
- `cd frontend && npm run dev` continua subindo
- healthcheck do backend continua verde
- proxy do frontend continua verde
- upload de audio continua funcionando

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

## Resolucao de problemas

**Container sai com codigo 137 (Out of Memory)**
O Docker nao tem memoria suficiente. Acesse Docker Desktop > Settings > Resources > Memory e aumente para 8 GB ou mais.

**Frontend nao conecta ao backend**
Verifique se o backend esta rodando em `http://localhost:8000`. Em modo de desenvolvimento o Vite faz proxy automatico das chamadas `/api` e `/health` para o backend.

**Modelo Whisper nao carrega**
Verifique se ha espaco em disco suficiente e conexao com a internet na primeira execucao. Os modelos sao salvos em `./whisper_models/`.
