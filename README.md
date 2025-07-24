# 🎙️ Verbalaize - Audio Transcription Service

Uma aplicação web completa para transcrição de áudio usando OpenAI Whisper, com backend FastAPI e frontend React.

## 🚀 Características

- **🎯 Transcrição de Arquivos**: Upload de arquivos de áudio (MP3, MP4, M4A, Opus, WAV, WebM)
- **🔴 Transcrição em Tempo Real**: Gravação e transcrição ao vivo via microfone
- **🧠 Modelos Whisper**: Escolha entre Small, Medium e Turbo
- **🌍 Múltiplas Ações**: Transcrever, traduzir para inglês ou outros idiomas
- **📱 Design Responsivo**: Interface adaptável para desktop e mobile
- **🐳 Containerizado**: Deploy fácil com Docker e Docker Compose

## 🏗️ Arquitetura

### Backend (FastAPI)
```
app/
├── main.py              # Ponto de entrada da aplicação
├── core/
│   └── config.py        # Configurações e variáveis de ambiente
├── schemas/
│   └── transcription.py # Modelos Pydantic para validação
├── services/
│   └── whisper_service.py # Lógica de negócio do Whisper
├── routes/
│   └── transcription.py # Endpoints da API
└── tests/
    ├── conftest.py
    └── test_transcription_routes.py
```

### Frontend (React + TypeScript)
```
frontend/src/
├── components/
│   ├── Layout.tsx
│   ├── ModelSelector.tsx
│   ├── ActionSelector.tsx
│   ├── UploadTranscription.tsx
│   └── RealTimeTranscription.tsx
├── services/
│   └── apiService.ts    # Comunicação com a API
├── store/
│   └── appStore.ts      # Gerenciamento de estado (Zustand)
├── App.tsx
└── App.css
```

## 🛠️ Tecnologias

**Backend:**
- FastAPI
- OpenAI Whisper
- PyTorch
- WebSockets
- Pydantic
- Uvicorn

**Frontend:**
- React 18
- TypeScript
- Zustand (gerenciamento de estado)
- Axios (HTTP client)
- React-Dropzone (upload de arquivos)

**DevOps:**
- Docker & Docker Compose
- Hot reload para desenvolvimento

## 🚀 Início Rápido

### Pré-requisitos
- **Para Docker**: Docker e Docker Compose instalados
- **Para desenvolvimento local**: Python 3.10+, Node.js 18+, Git

## 🎯 Opção 1: Sequência Recomendada (Docker)

### 1. Clone o repositório
```bash
git clone <repository-url>
cd verbalaize
```

### 2. Validar setup (opcional)
```bash
bash validate-setup.sh
```

### 3. Build otimizado com modelos pré-baixados
```bash
bash build.sh
```
⏱️ **Primeira vez**: 10-15 minutos (baixa ~4.7GB de modelos Whisper)  
⚡ **Próximas vezes**: ~2 minutos (usa cache do Docker)  
💾 **Requisito**: Docker com 8GB+ de RAM (Settings → Resources → Memory)

### 4. Execute a aplicação
```bash
docker-compose up
```

### 5. Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs

## 🔧 Opção 2: Desenvolvimento Local (Terminais Separados)

### Backend (Terminal 1)
```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Executar servidor de desenvolvimento
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Terminal 2)
```bash
# Navegar para o diretório frontend
cd frontend

# Criar arquivo utils.ts se não existir
mkdir -p src/lib
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev
```

### Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs

## ⚡ Comparação de Métodos

| Método | Primeira Execução | Execuções Seguintes | Modelos Whisper | Requisitos | Isolamento |
|--------|-------------------|---------------------|-----------------|------------|------------|
| **Docker (Recomendado)** | 10-15 min | ~10 segundos | ✅ Pré-baixados | 8GB+ RAM | ✅ Completo |
| **Local (Desenvolvimento)** | 2-3 min | ~5 segundos | ❌ Download on-demand | Python 3.10+ | ❌ Depende do sistema |

### 💾 Requisitos de Sistema

**Para Docker:**
- Docker Desktop com **8GB+ de RAM**
- ~5GB de espaço livre em disco
- Processador: Qualquer (x64/ARM64)

**Para Desenvolvimento Local:**
- Python 3.10+
- Node.js 18+
- ~2GB de RAM livre
- Os modelos são baixados conforme usado

## 📡 Endpoints da API

### Transcrição por Upload
```http
POST /api/v1/transcribe/upload
Content-Type: multipart/form-data

Parameters:
- file: Audio file
- model: "small" | "medium" | "turbo"
- action: "transcribe" | "translate_english" | "translate_language"
- target_language: Language code (optional)
```

### Transcrição em Tempo Real
```http
WebSocket: /api/v1/transcribe/realtime

Configuration message:
{
  "type": "config",
  "model": "medium",
  "action": "transcribe",
  "target_language": null
}

Then send audio chunks as binary data
```

## 🎨 Interface do Usuário

### Controles Globais
- **Seletor de Modelo**: Escolha entre Small, Medium, Turbo
- **Seletor de Ação**: Transcrever, Traduzir para Inglês, Traduzir para outro idioma

### Transcrição por Upload
- Área de drag-and-drop para arquivos
- Suporte a múltiplos formatos de áudio
- Validação de tamanho (max 100MB)
- Indicador de progresso
- Área de resultado editável

### Transcrição em Tempo Real
- Controles de gravação (Iniciar/Parar)
- Indicador visual de gravação
- Transcrição ao vivo com texto parcial
- Buffer de áudio inteligente

## 🔒 Configuração de Segurança

- CORS configurado para desenvolvimento
- Validação de tipos de arquivo
- Limite de tamanho de arquivo
- Tratamento de erros robusto
- Limpeza automática de arquivos temporários

## 🛠️ Troubleshooting

### Problema: Erro `Failed to resolve import "@/lib/utils"`
**Solução**: Criar arquivo utils.ts faltante
```bash
cd frontend
mkdir -p src/lib
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
```

### Problema: Modelos Whisper sendo baixados a cada startup
**Solução**: Use o script `build.sh` para pré-baixar modelos
```bash
./build.sh  # Baixa todos os modelos durante o build
```

### Problema: Container sai com código 137 (Out of Memory) ou build falha
**Causa**: Docker não tem memória suficiente para baixar modelos Whisper  
**Solução**: Aumentar memória do Docker
- **Docker Desktop**: Settings → Resources → Memory: **8GB+**
- **Linux**: Aumentar swap ou fechar outras aplicações
- **Alternativa**: Use desenvolvimento local (Opção 2) que baixa modelos conforme necessário

### Problema: Build falha com "ResourceExhausted: cannot allocate memory"
**Solução**: 
1. Aumentar memória do Docker para 8GB+
2. Fechar outras aplicações pesadas (Chrome, IDEs)
3. Reiniciar Docker Desktop
4. Usar desenvolvimento local como alternativa

### Problema: Frontend não conecta com backend
**Solução**: Verificar proxy do Vite
```bash
# Verificar se vite.config.ts tem proxy configurado
grep -A 10 "proxy" frontend/vite.config.ts
```

## 📋 Scripts Disponíveis

### Validação e Build
```bash
./validate-setup.sh  # Verifica se todos os arquivos necessários existem
./build.sh           # Build otimizado com modelos pré-baixados
./test-connection.sh # Testa conectividade entre frontend e backend
```

### Frontend
```bash
cd frontend
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run build:dev    # Build para desenvolvimento
npm run preview      # Preview do build
npm run lint         # Verificar código
```

### Backend
```bash
cd app
uvicorn main:app --reload                    # Desenvolvimento
uvicorn main:app --host 0.0.0.0 --port 8000 # Produção local
pytest                                       # Executar testes
```

## 📦 Deploy em Produção

### Usando Docker
```bash
# Build das imagens
docker-compose build

# Deploy
docker-compose up -d
```

### Configurações de Produção
- Configure variáveis de ambiente adequadas
- Use um proxy reverso (nginx)
- Configure SSL/HTTPS
- Monitore logs e performance
- Configure backup dos modelos Whisper

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas e suporte:
- Abra uma issue no repositório
- Consulte a documentação da API em `/docs`
- Verifique os logs dos containers

## 🎯 Roadmap

- [ ] Suporte a mais idiomas de tradução
- [ ] Interface para configuração de modelos customizados
- [ ] Histórico de transcrições
- [ ] Exportação em diferentes formatos
- [ ] API de webhook para notificações
- [ ] Dashboard de analytics
- [ ] Suporte a arquivos em lote
