# 🖥️ Plano: VerbalAIze Desktop com Tauri

> **Decisão do bundle:** Opção B — Download do modelo na primeira execução.  
> O instalador fica leve (~50 MB), e o modelo Whisper (~1.5 GB) é baixado sob demanda.

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        VerbalAIze.app                          │
│                                                                │
│  ┌──────────────┐   gera secret + porta   ┌────────────────┐  │
│  │  Tauri Shell  │ ──────────────────────▶ │ Python Sidecar │  │
│  │  (main.rs)    │                         │ (FastAPI)      │  │
│  └──────┬───────┘                         └───────┬────────┘  │
│         │ injeta window.__VERBALAIZE__             │           │
│         ▼                                         │           │
│  ┌──────────────┐   HTTP/WS 127.0.0.1:<porta>    │           │
│  │  WebView      │ ◀─────────────────────────────┘           │
│  │  (React SPA)  │                                            │
│  └──────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura Final do Projeto

```
verbalaize/
├── app/                          ← backend Python (já existe ✅)
├── frontend/                     ← React/Vite (já existe ✅)
├── desktop/                      ← NOVO: app Tauri
│   ├── src-tauri/
│   │   ├── src/
│   │   │   └── main.rs           ← gerencia sidecar + porta + secret
│   │   ├── binaries/             ← binário PyInstaller do backend
│   │   │   └── verbalaize-backend-aarch64-apple-darwin
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   └── build.rs
│   └── package.json
├── scripts/
│   └── build-backend.sh          ← NOVO: script PyInstaller
├── docker-compose.yml            ← mantido para dev web
├── Makefile                      ← atualizado com targets desktop
└── PLANO_DESKTOP_TAURI.md        ← este arquivo
```

---

## Pré-requisitos

| Ferramenta | Comando de instalação | Motivo |
|---|---|---|
| **Rust** | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | Runtime do Tauri |
| **Tauri CLI v2** | `cargo install tauri-cli --version "^2"` | Build do app desktop |
| **PyInstaller** | `pip install pyinstaller` | Empacotar backend Python em binário |
| **Node.js ≥ 18** | Já instalado (usado pelo frontend) | Build do frontend React |

> **Nota:** No macOS, o Xcode Command Line Tools também é necessário (`xcode-select --install`).

---

## Fases de Implementação

### Fase 1 — Empacotar o Backend com PyInstaller

**Objetivo:** Gerar um binário standalone do backend FastAPI/Whisper.

#### 1.1 Criar `scripts/build-backend.sh`

```bash
#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../app"

echo "🔨 Empacotando backend com PyInstaller..."

pyinstaller \
  --onefile \
  --name verbalaize-backend \
  --hidden-import=whisper \
  --hidden-import=torch \
  --hidden-import=torchaudio \
  --hidden-import=faster_whisper \
  --hidden-import=uvicorn \
  --hidden-import=uvicorn.logging \
  --hidden-import=uvicorn.loops \
  --hidden-import=uvicorn.loops.auto \
  --hidden-import=uvicorn.protocols \
  --hidden-import=uvicorn.protocols.http \
  --hidden-import=uvicorn.protocols.http.auto \
  --hidden-import=uvicorn.protocols.websockets \
  --hidden-import=uvicorn.protocols.websockets.auto \
  --hidden-import=uvicorn.lifespan \
  --hidden-import=uvicorn.lifespan.on \
  --hidden-import=app.core.config \
  --hidden-import=app.middleware.token \
  --hidden-import=app.routes.transcription \
  --hidden-import=app.schemas.transcription \
  --hidden-import=app.services.whisper_service \
  --collect-data whisper \
  main.py

echo "✅ Binário gerado em app/dist/verbalaize-backend"
```

#### 1.2 Copiar binário para desktop/src-tauri/binaries/

O nome precisa seguir o padrão `<nome>-<target-triple>`:

```bash
# macOS Apple Silicon (M1/M2/M3)
cp app/dist/verbalaize-backend \
   desktop/src-tauri/binaries/verbalaize-backend-aarch64-apple-darwin

# macOS Intel
cp app/dist/verbalaize-backend \
   desktop/src-tauri/binaries/verbalaize-backend-x86_64-apple-darwin
```

#### 1.3 Considerações PyInstaller + Whisper

- **NÃO incluir o modelo no binário** (Opção B). O modelo será baixado na primeira execução.
- O `whisper_model_cache_dir` no config.py precisa apontar para um diretório persistente do usuário em modo desktop (ex: `~/Library/Application Support/com.verbalaize.app/models`).
- O `--collect-data whisper` é necessário para incluir os assets do whisper (tokenizer, etc.) que não são o modelo em si.

---

### Fase 2 — Adaptar o Backend para Modo Desktop

**Objetivo:** O backend precisa saber quando está em modo desktop para usar caminhos corretos e suportar download lazy do modelo.

#### 2.1 Atualizar `app/core/config.py`

Adicionar configuração de diretório de dados do app desktop:

```python
import os
import sys
from pathlib import Path

class Settings(BaseSettings):
    # ... campos existentes ...

    # Desktop mode — set by Tauri via env var
    desktop_mode: bool = False

    @property
    def effective_model_cache_dir(self) -> str:
        """In desktop mode, use a persistent user-data directory.
        Otherwise, use whisper_model_cache_dir (project-relative)."""
        if self.desktop_mode:
            if sys.platform == "darwin":
                base = Path.home() / "Library" / "Application Support"
            elif sys.platform == "win32":
                base = Path(os.environ.get("APPDATA", Path.home()))
            else:
                base = Path.home() / ".local" / "share"
            data_dir = base / "com.verbalaize.app" / "models"
            data_dir.mkdir(parents=True, exist_ok=True)
            return str(data_dir)
        return self.whisper_model_cache_dir
```

#### 2.2 Adicionar endpoint de status/download do modelo — `app/routes/models.py` (NOVO)

```python
# GET  /api/v1/models/status         → {model: "turbo", downloaded: true/false, size_bytes: ...}
# POST /api/v1/models/download       → inicia download, retorna progresso via SSE ou polling
# GET  /api/v1/models/download/progress → {progress: 0-100, stage: "downloading"}
```

Este endpoint será usado pela tela de setup do frontend para mostrar progresso de download do modelo na primeira execução.

#### 2.3 Atualizar `whisper_service.py`

Usar `settings.effective_model_cache_dir` em vez de `settings.whisper_model_cache_dir` ao carregar modelos:

```python
whisper.load_model(
    model_name,
    device=self.device,
    download_root=settings.effective_model_cache_dir,  # ← mudança
)
```

#### 2.4 Permitir CORS dinâmico para portas efêmeras

Em modo desktop, a porta é dinâmica. O CORS precisa aceitar `http://127.0.0.1:*` e `tauri://localhost`:

```python
if settings.desktop_mode:
    # Tauri webview uses tauri:// or https://tauri.localhost
    allow_origins = ["tauri://localhost", "https://tauri.localhost"]
    # Also allow all localhost origins since port is ephemeral
else:
    allow_origins = [...]  # lista fixa atual
```

> **Alternativa mais simples**: como no modo desktop todo acesso é local e protegido por secret, pode-se usar `allow_origins=["*"]` apenas nesse modo.

---

### Fase 3 — Inicializar o Projeto Tauri

**Objetivo:** Criar a estrutura `desktop/` com Tauri v2.

#### 3.1 Criar diretório e inicializar

```bash
mkdir -p desktop
cd desktop
npm init -y
npm install @tauri-apps/api @tauri-apps/plugin-shell
cd ..
cargo tauri init --app-name "VerbalAIze" \
  --window-title "VerbalAIze" \
  --frontend-dist "../frontend/dist" \
  --dev-url "http://localhost:3000" \
  --before-dev-command "cd ../frontend && npm run dev" \
  --before-build-command "cd ../frontend && npm run build"
```

#### 3.2 Configurar `desktop/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/nickel-org/tauri/dev/crates/tauri-utils/schema.json",
  "productName": "VerbalAIze",
  "version": "1.0.0",
  "identifier": "com.verbalaize.app",
  "build": {
    "beforeBuildCommand": "cd ../frontend && npm run build",
    "beforeDevCommand": "cd ../frontend && npm run dev",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "windows": [
      {
        "title": "VerbalAIze",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "center": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:"
    }
  },
  "bundle": {
    "active": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "targets": "all",
    "externalBin": ["binaries/verbalaize-backend"],
    "resources": [],
    "macOS": {
      "minimumSystemVersion": "12.0",
      "frameworks": []
    }
  },
  "plugins": {
    "shell": {
      "open": false,
      "sidecar": true
    }
  }
}
```

#### 3.3 Configurar `desktop/src-tauri/Cargo.toml`

```toml
[package]
name = "verbalaize-desktop"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
uuid = { version = "1", features = ["v4"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

#### 3.4 Criar `desktop/src-tauri/src/main.rs`

Este é o coração da integração — inicia o sidecar Python com secret e porta:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpListener;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("Failed to bind ephemeral port")
        .local_addr()
        .unwrap()
        .port()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let secret = Uuid::new_v4().to_string();
            let port = find_free_port();

            println!("[tauri] Starting sidecar on port {} with secret {}", port, &secret[..8]);

            // Inicia o sidecar Python com env vars
            let (mut _rx, _child) = app.shell()
                .sidecar("verbalaize-backend")
                .expect("Failed to create sidecar command")
                .env("VBZ_APP_SECRET", &secret)
                .env("VBZ_PORT", port.to_string())
                .env("VBZ_HOST", "127.0.0.1")
                .env("VBZ_DESKTOP_MODE", "true")
                .env("VBZ_SERVE_FRONTEND_DIST", "false")
                .spawn()
                .expect("Failed to spawn sidecar");

            // Injeta configuração na janela para o frontend acessar
            let window = app.get_webview_window("main")
                .expect("Failed to get main window");

            let init_script = format!(
                "window.__VERBALAIZE__ = {{ secret: '{}', port: {} }};",
                secret, port
            );
            window.eval(&init_script)
                .expect("Failed to inject init script");

            println!("[tauri] Frontend configured with port {}", port);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running VerbalAIze");
}
```

#### 3.5 Criar `desktop/src-tauri/build.rs`

```rust
fn main() {
    tauri_build::build()
}
```

---

### Fase 4 — Adaptar o Frontend para Detectar Modo Tauri

**Objetivo:** O frontend deve ler `window.__VERBALAIZE__` quando presente, senão funcionar como web.

#### 4.1 Atualizar `frontend/src/services/api.ts`

```typescript
// Detecta se está rodando dentro do Tauri
declare global {
  interface Window {
    __VERBALAIZE__?: { secret: string; port: number };
  }
}

const tauri = window.__VERBALAIZE__;

const API_BASE_URL = tauri
  ? `http://127.0.0.1:${tauri.port}`
  : (import.meta.env.VITE_API_URL?.trim() || window.location.origin);

const WS_BASE_URL = tauri
  ? `ws://127.0.0.1:${tauri.port}`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

/** Returns the X-App-Secret header when running in desktop mode. */
function secretHeaders(): Record<string, string> {
  return tauri ? { 'X-App-Secret': tauri.secret } : {};
}

/** Appends ?secret=<token> to a WebSocket URL when running in desktop mode. */
function wsUrl(path: string): string {
  const base = `${WS_BASE_URL}${path}`;
  return tauri
    ? `${base}?secret=${encodeURIComponent(tauri.secret)}`
    : base;
}
```

O restante do `api.ts` permanece inalterado — `secretHeaders()` e `wsUrl()` já são usados em todos os lugares.

#### 4.2 Criar tela de Setup / Download do Modelo (NOVO)

Criar `frontend/src/pages/ModelSetup.tsx`:

- Exibida na primeira execução quando o modelo ainda não está baixado
- Mostra progresso de download com barra animada
- Permite ao usuário escolher o modelo (small ~500MB, medium ~1.5GB, turbo ~1.5GB)
- Após o download, redireciona para a tela principal

**Fluxo:**
```
App monta → verifica /api/v1/models/status
  ├─ modelo presente → tela normal (Index)
  └─ modelo ausente → tela ModelSetup
      ├─ usuário clica "Baixar"
      ├─ POST /api/v1/models/download
      ├─ polling GET /api/v1/models/download/progress (a cada 1s)
      └─ download completo → redireciona para Index
```

#### 4.3 Atualizar `frontend/src/App.tsx`

Adicionar rota `/setup` e lógica de redirect condicional baseada em `window.__VERBALAIZE__` e status do modelo.

#### 4.4 Atualizar health check para modo desktop

O `useApiHealth` precisa de retry com backoff no modo desktop, porque o sidecar Python pode demorar alguns segundos para iniciar:

```typescript
// Em modo desktop, retry a cada 500ms por até 15 segundos
const MAX_RETRIES_DESKTOP = 30;
const RETRY_INTERVAL_MS = 500;
```

---

### Fase 5 — Endpoint de Download de Modelo

**Objetivo:** API para verificar se o modelo está disponível e baixá-lo sob demanda.

#### 5.1 Criar `app/routes/models.py` (NOVO)

```python
@router.get("/status/{model_name}")
async def model_status(model_name: ModelType):
    """Verifica se um modelo Whisper já está no cache local."""
    cache_dir = settings.effective_model_cache_dir
    # Whisper armazena como <model_name>.pt
    model_file = Path(cache_dir) / f"{model_name.value}.pt"
    return {
        "model": model_name.value,
        "downloaded": model_file.exists(),
        "size_bytes": model_file.stat().st_size if model_file.exists() else 0,
        "cache_dir": cache_dir,
    }

@router.post("/download/{model_name}")
async def download_model(model_name: ModelType, background_tasks: BackgroundTasks):
    """Inicia o download de um modelo Whisper em background."""
    # Usa whisper._download internamente
    # Progresso é rastreado via variável global ou similar
    ...
```

#### 5.2 Registrar no `app/main.py`

```python
from app.routes import transcription, models
app.include_router(models.router, prefix="/api")
```

---

### Fase 6 — Build e Distribuição

#### 6.1 Script de build completo

Atualizar `scripts/build-backend.sh` e criar `scripts/build-desktop.sh`:

```bash
#!/bin/bash
# scripts/build-desktop.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "📦 Etapa 1: Empacotando backend Python..."
bash "$SCRIPT_DIR/build-backend.sh"

echo "📋 Etapa 2: Copiando binário para Tauri..."
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  TARGET="aarch64-apple-darwin"
elif [ "$ARCH" = "x86_64" ]; then
  TARGET="x86_64-apple-darwin"
fi

mkdir -p "$ROOT/desktop/src-tauri/binaries"
cp "$ROOT/app/dist/verbalaize-backend" \
   "$ROOT/desktop/src-tauri/binaries/verbalaize-backend-$TARGET"

echo "🔨 Etapa 3: Build do Tauri..."
cd "$ROOT/desktop"
cargo tauri build

echo "✅ Pronto! Instalador em desktop/src-tauri/target/release/bundle/"
```

#### 6.2 Atualizar Makefile

```makefile
# Targets desktop
build-backend-bin:
	bash scripts/build-backend.sh

build-desktop: build-backend-bin
	bash scripts/build-desktop.sh

dev-desktop:
	cd desktop && cargo tauri dev
```

#### 6.3 Artefatos finais

O `cargo tauri build` gera automaticamente:

| Plataforma | Artefato | Localização |
|---|---|---|
| macOS | `.dmg` + `.app` | `desktop/src-tauri/target/release/bundle/dmg/` |
| macOS | `.app` | `desktop/src-tauri/target/release/bundle/macos/` |

---

### Fase 7 — Ajustes Finais e Polimento

#### 7.1 Atualizar `.gitignore`

```gitignore
# Tauri / Desktop
desktop/src-tauri/target/
desktop/src-tauri/binaries/
desktop/src-tauri/icons/
```

#### 7.2 Ícone do app

Criar ou gerar ícones nos formatos necessários usando `cargo tauri icon`:

```bash
cargo tauri icon path/to/icon-1024x1024.png
```

#### 7.3 Graceful shutdown do sidecar

O Tauri automaticamente mata o processo sidecar quando o app fecha. Mas é bom garantir que o Python salva estado corretamente adicionando handler de SIGTERM no `main.py`.

#### 7.4 Splash screen (opcional)

Enquanto o backend Python está inicializando (pode demorar 3-10s), mostrar uma tela de loading no frontend com animação.

---

## Fluxo em Produção (Opção B — Download Lazy)

```
1. Usuário abre VerbalAIze.app
         ↓
2. Tauri gera UUID secret + encontra porta livre
         ↓
3. Lança verbalaize-backend com VBZ_APP_SECRET, VBZ_PORT, VBZ_DESKTOP_MODE=true
         ↓
4. Injeta window.__VERBALAIZE__ = {secret, port} na janela
         ↓
5. Frontend React carrega, lê secret e porta
         ↓
6. Frontend checa /api/v1/models/status/turbo
   ├─ modelo presente → tela principal
   └─ modelo ausente → tela de setup com download
         ↓
7. Todas as chamadas HTTP/WS usam 127.0.0.1:<porta> + secret header
         ↓
8. Usuário fecha o app → Tauri mata o sidecar automaticamente
```

---

## Desafios e Riscos

| Risco | Mitigação |
|---|---|
| **PyInstaller + torch/whisper** é frágil | Testar exaustivamente. Considerar `cx_Freeze` ou `Nuitka` como alternativas |
| **Binário Python muito grande** (~500MB+) | Excluir modelos (Opção B). Usar `--exclude-module` para deps desnecessárias (jupyter, matplotlib, pandas, seaborn) |
| **Startup lento do sidecar** (~5-10s) | Splash screen + retry no frontend health check |
| **Download do modelo falha** | Retry com backoff exponencial. Permitir retomar download interrompido |
| **CSP do Tauri bloqueia requests** | Configurar `connect-src` com `http://127.0.0.1:*` e `ws://127.0.0.1:*` |
| **Compatibilidade cross-platform** | Começar com macOS. Windows/Linux depois |

---

## Ordem de Execução

| Etapa | Fase | Descrição | Dependência |
|---|---|---|---|
| 1 | Fase 2 | Adaptar backend (config, CORS, model cache dir) | — |
| 2 | Fase 5 | Criar endpoint de modelos (status + download) | Etapa 1 |
| 3 | Fase 1 | Empacotar backend com PyInstaller | Etapa 1, 2 |
| 4 | Fase 3 | Inicializar projeto Tauri (conf, main.rs) | — |
| 5 | Fase 4 | Adaptar frontend (api.ts, setup screen) | Etapa 2 |
| 6 | Fase 6 | Scripts de build completo | Etapas 3, 4, 5 |
| 7 | Fase 7 | Polimento (ícones, gitignore, graceful shutdown) | Etapa 6 |

---

## Estimativa de Tamanho

| Componente | Tamanho estimado |
|---|---|
| Binário Python (PyInstaller, sem modelo) | ~300–500 MB |
| Frontend build (dist/) | ~5 MB |
| Tauri runtime | ~10 MB |
| **Instalador total (sem modelo)** | **~350–550 MB** |
| Modelo Whisper turbo (download posterior) | ~1.5 GB |

> **Nota:** O tamanho do binário Python pode ser reduzido significativamente excluindo dependências de análise (pandas, jupyter, matplotlib, seaborn, jiwer) que não são necessárias no app desktop.
