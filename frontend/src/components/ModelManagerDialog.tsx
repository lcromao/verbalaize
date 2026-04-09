import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';
import { ModelInstallPanel } from './ModelInstallPanel';

export const ModelManagerDialog = () => {
  const { closeManager, isDesktop, isManagerOpen } = useDesktopSetup();

  if (!isDesktop) {
    return null;
  }

  return (
    <Dialog open={isManagerOpen} onOpenChange={(open) => !open && closeManager()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gerenciar modelos</DialogTitle>
        </DialogHeader>

        <ModelInstallPanel
          title="Instale modelos adicionais"
          description="Você pode preparar outros modelos a qualquer momento. Modelos já instalados ficam disponíveis imediatamente no seletor."
          compact
        />
      </DialogContent>
    </Dialog>
  );
};
