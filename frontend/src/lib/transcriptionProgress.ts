export const getStageLabel = (stage: string, action: string) => {
  switch (stage) {
    case 'queued':
      return 'Na fila';
    case 'processing':
      return 'Preparando transcrição';
    case 'audio_received':
      return 'Áudio recebido';
    case 'loading_model':
      return 'Carregando modelo';
    case 'model_ready':
      return 'Modelo pronto';
    case 'transcribing':
      return action === 'translate_english' ? 'Traduzindo áudio' : 'Transcrevendo áudio';
    case 'finalizing':
      return 'Finalizando';
    case 'completed':
      return 'Concluído';
    case 'failed':
      return 'Falhou';
    default:
      return 'Processando';
  }
};
