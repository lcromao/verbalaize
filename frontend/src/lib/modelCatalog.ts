import { TranscriptionAction, WhisperModel } from '@/hooks/useTranscriptionStore';

export const MODEL_CATALOG: Array<{
  model: WhisperModel;
  label: string;
  sizeLabel: string;
  speedLabel: string;
  qualityLabel: string;
  description: string;
  supportsTranslation: boolean;
}> = [
  {
    model: 'small',
    label: 'Small',
    sizeLabel: '~1 GB',
    speedLabel: 'Mais rápido',
    qualityLabel: 'Boa',
    description: 'Melhor escolha para setup rápido e uso leve em CPU.',
    supportsTranslation: true,
  },
  {
    model: 'medium',
    label: 'Medium',
    sizeLabel: '~1.5 GB',
    speedLabel: 'Equilibrado',
    qualityLabel: 'Ótima',
    description: 'Bom equilíbrio entre qualidade e tempo de processamento.',
    supportsTranslation: true,
  },
  {
    model: 'turbo',
    label: 'Turbo',
    sizeLabel: '~1.5 GB',
    speedLabel: 'Rápido',
    qualityLabel: 'Ótima',
    description: 'Melhor qualidade geral para transcrição contínua após o setup inicial.',
    supportsTranslation: false,
  },
];

const DEFAULT_MODEL_ORDER: WhisperModel[] = ['turbo', 'medium', 'small'];
const TRANSLATION_MODEL_ORDER: WhisperModel[] = ['medium', 'small'];

export const isModelActionSupported = (
  model: WhisperModel,
  action: TranscriptionAction,
) => action !== 'translate_english' || model !== 'turbo';

export const getPreferredModelForAction = (
  action: TranscriptionAction,
  availableModels: WhisperModel[],
): WhisperModel | null => {
  const compatibleModels = availableModels.filter((model) =>
    isModelActionSupported(model, action),
  );

  if (compatibleModels.length === 0) {
    return null;
  }

  const preferredOrder =
    action === 'translate_english' ? TRANSLATION_MODEL_ORDER : DEFAULT_MODEL_ORDER;

  return (
    preferredOrder.find((model) => compatibleModels.includes(model)) ??
    compatibleModels[0]
  );
};

export const getModelPreparationStageLabel = (stage: string) => {
  switch (stage) {
    case 'checking_cache':
      return 'Verificando arquivos já instalados';
    case 'downloading':
      return 'Baixando modelo';
    case 'loading_model':
      return 'Carregando modelo';
    case 'ready':
      return 'Modelo pronto';
    case 'failed':
      return 'Falha ao preparar modelo';
    default:
      return 'Preparando modelo';
  }
};
