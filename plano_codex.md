# Plano Codex

Implementação de desktop baseada em Tauri v2 para o Verbalaize, com:

- `desktop/` como host desktop
- backend Python empacotado como sidecar PyInstaller
- runtime desktop com porta e secret efêmeros
- FFmpeg bundlado por plataforma
- setup inicial para download de modelos Whisper
- pipeline GitHub Actions para gerar bundles nativos

O plano detalhado usado como base desta implementação foi consolidado no histórico do projeto e refletido nos arquivos adicionados em `desktop/`, `pyinstaller/` e `.github/workflows/`.
