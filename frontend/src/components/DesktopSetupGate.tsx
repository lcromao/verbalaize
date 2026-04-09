import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModelInstallPanel } from './ModelInstallPanel';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';

export const DesktopSetupGate = ({ children }: { children: React.ReactNode }) => {
  const { hasInstalledModels, isDesktop, isLoading, refreshModels, startupError } = useDesktopSetup();

  if (!isDesktop || hasInstalledModels) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Inicializando Verbalaize</h2>
            <p className="text-sm text-muted-foreground">
              Verificando o backend local e os modelos disponíveis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (startupError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Backend desktop indisponível</h2>
            <p className="text-sm text-muted-foreground">
              Não foi possível consultar os modelos do app local.
            </p>
            <p className="text-sm text-destructive">{startupError}</p>
          </div>
          <Button onClick={() => void refreshModels()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <ModelInstallPanel
          title="Escolha seu primeiro modelo"
          description="O app desktop inclui o runtime local, mas os pesos do Whisper são baixados na primeira execução. Instale um modelo para liberar o uso do Verbalaize."
        />
      </div>
    </div>
  );
};
