/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiService, ModelPreparationJobStatus } from '@/services/api';
import { getDesktopRuntime } from '@/lib/desktopRuntime';
import { getPreferredModelForAction } from '@/lib/modelCatalog';
import { WhisperModel, useTranscriptionStore } from './useTranscriptionStore';

const MODEL_POLL_INTERVAL_MS = 1250;
const EMPTY_MODELS: Array<{ model: WhisperModel; installed: boolean }> = [];

interface DesktopSetupContextValue {
  isDesktop: boolean;
  isLoading: boolean;
  startupError: string | null;
  models: Array<{ model: WhisperModel; installed: boolean }>;
  installedModels: WhisperModel[];
  hasInstalledModels: boolean;
  isManagerOpen: boolean;
  openManager: () => void;
  closeManager: () => void;
  prepareModel: (model: WhisperModel) => Promise<void>;
  preparationJob: ModelPreparationJobStatus | null;
  preparationError: string | null;
  isPreparing: boolean;
  refreshModels: () => Promise<void>;
}

const DesktopSetupContext = createContext<DesktopSetupContextValue | null>(null);

export const DesktopSetupProvider = ({ children }: { children: React.ReactNode }) => {
  const runtime = getDesktopRuntime();
  const isDesktop = Boolean(runtime);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [preparationJob, setPreparationJob] = useState<ModelPreparationJobStatus | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { action, model, setAction, setModel } = useTranscriptionStore();

  const modelsQuery = useQuery({
    queryKey: ['desktop-models'],
    queryFn: ApiService.listModels,
    enabled: isDesktop,
    retry: 1,
  });

  const prepareMutation = useMutation({
    mutationFn: ApiService.prepareModel,
    onMutate: () => {
      setPreparationError(null);
    },
    onSuccess: (job) => {
      setPreparationJob(job);
      setActiveJobId(job.job_id);
    },
    onError: (error) => {
      setPreparationError(error instanceof Error ? error.message : 'Erro desconhecido');
    },
  });

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const pollJob = async () => {
      try {
        const status = await ApiService.getModelPreparationJobStatus(activeJobId);
        if (cancelled) {
          return;
        }

        setPreparationJob(status);

        if (status.status === 'completed') {
          setActiveJobId(null);
          await queryClient.invalidateQueries({ queryKey: ['desktop-models'] });
          return;
        }

        if (status.status === 'failed') {
          setActiveJobId(null);
          setPreparationError(status.error || 'Falha ao preparar modelo');
          await queryClient.invalidateQueries({ queryKey: ['desktop-models'] });
          return;
        }

        timeoutId = window.setTimeout(pollJob, MODEL_POLL_INTERVAL_MS);
      } catch (error) {
        if (!cancelled) {
          setActiveJobId(null);
          setPreparationError(
            error instanceof Error ? error.message : 'Falha ao consultar o status do modelo',
          );
        }
      }
    };

    void pollJob();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeJobId, queryClient]);

  const models = modelsQuery.data?.models ?? EMPTY_MODELS;
  const installedModels = useMemo(
    () => models.filter((entry) => entry.installed).map((entry) => entry.model),
    [models],
  );
  const hasInstalledModels = installedModels.length > 0;

  useEffect(() => {
    const availableModels = isDesktop
      ? installedModels
      : (['small', 'medium', 'turbo'] satisfies WhisperModel[]);

    if (availableModels.length === 0) {
      if (action === 'translate_english') {
        setAction('transcribe');
      }
      return;
    }

    const preferredModel = getPreferredModelForAction(action, availableModels);

    if (!preferredModel) {
      if (action === 'translate_english') {
        setAction('transcribe');
      }
      return;
    }

    if (!availableModels.includes(model) || model !== preferredModel && action === 'translate_english') {
      setModel(preferredModel);
    }
  }, [
    action,
    hasInstalledModels,
    installedModels,
    isDesktop,
    model,
    setAction,
    setModel,
  ]);

  const refreshModels = async () => {
    await modelsQuery.refetch();
  };

  const prepareModel = async (selectedModel: WhisperModel) => {
    await prepareMutation.mutateAsync(selectedModel);
  };

  const value: DesktopSetupContextValue = {
    isDesktop,
    isLoading: isDesktop && modelsQuery.isLoading,
    startupError:
      isDesktop && modelsQuery.error instanceof Error ? modelsQuery.error.message : null,
    models,
    installedModels,
    hasInstalledModels,
    isManagerOpen,
    openManager: () => setIsManagerOpen(true),
    closeManager: () => setIsManagerOpen(false),
    prepareModel,
    preparationJob,
    preparationError,
    isPreparing: prepareMutation.isPending || activeJobId !== null,
    refreshModels,
  };

  return (
    <DesktopSetupContext.Provider value={value}>
      {children}
    </DesktopSetupContext.Provider>
  );
};

export const useDesktopSetup = () => {
  const context = useContext(DesktopSetupContext);
  if (!context) {
    throw new Error('useDesktopSetup must be used within DesktopSetupProvider');
  }
  return context;
};
