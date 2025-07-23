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
- Docker e Docker Compose instalados
- Git

### 1. Clone o repositório
```bash
git clone <repository-url>
cd verbalaize
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite .env conforme necessário
```

### 3. Execute com Docker Compose
```bash
docker-compose up --build
```

### 4. Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs

## 🔧 Desenvolvimento Local

### Backend
```bash
# Instalar dependências
pip install -r requirements.txt

# Executar servidor de desenvolvimento
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Navegar para o diretório frontend
cd frontend

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm start
```

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

## 🧪 Testes

```bash
# Backend
cd app
pytest

# Frontend
cd frontend
npm test
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
