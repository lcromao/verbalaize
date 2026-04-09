import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MODEL_CATALOG, getModelPreparationStageLabel } from '@/lib/modelCatalog';
import { WhisperModel } from '@/hooks/useTranscriptionStore';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';

interface ModelInstallPanelProps {
  title: string;
  description: string;
  compact?: boolean;
}

export const ModelInstallPanel = ({
  title,
  description,
  compact = false,
}: ModelInstallPanelProps) => {
  const {
    installedModels,
    isPreparing,
    preparationError,
    preparationJob,
    prepareModel,
  } = useDesktopSetup();
  const [selectedModel, setSelectedModel] = useState<WhisperModel>('small');
  const installedSet = new Set(installedModels);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className={`${compact ? 'text-lg' : 'text-3xl'} font-semibold tracking-tight`}>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {preparationError && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao preparar o modelo</AlertTitle>
          <AlertDescription>{preparationError}</AlertDescription>
        </Alert>
      )}

      {preparationJob && (
        <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium">
                {MODEL_CATALOG.find((entry) => entry.model === preparationJob.model)?.label ?? preparationJob.model}
              </p>
              <p className="text-muted-foreground">
                {getModelPreparationStageLabel(preparationJob.stage)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-3'}`}>
        {MODEL_CATALOG.map((entry) => {
          const isInstalled = installedSet.has(entry.model);
          const isSelected = selectedModel === entry.model;
          const isCurrentJob = preparationJob?.model === entry.model && isPreparing;

          return (
            <Card
              key={entry.model}
              className={`border transition-colors ${isSelected ? 'border-primary shadow-sm' : 'border-border/60'}`}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{entry.label}</CardTitle>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {isInstalled ? 'Instalado' : entry.sizeLabel}
                  </span>
                </div>
                <CardDescription>{entry.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Velocidade: {entry.speedLabel}</p>
                  <p>Qualidade: {entry.qualityLabel}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedModel(entry.model)}
                    disabled={isPreparing}
                  >
                    Selecionar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    variant={isInstalled ? 'secondary' : 'default'}
                    disabled={isInstalled || isPreparing}
                    onClick={() => void prepareModel(entry.model)}
                  >
                    {isCurrentJob ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Preparando
                      </>
                    ) : isInstalled ? 'Pronto' : 'Instalar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!installedSet.has(selectedModel) && !isPreparing && (
        <Button
          size="lg"
          onClick={() => void prepareModel(selectedModel)}
          className="w-full"
        >
          Instalar {MODEL_CATALOG.find((entry) => entry.model === selectedModel)?.label}
        </Button>
      )}
    </div>
  );
};
