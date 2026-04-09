import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { MODEL_CATALOG, isModelActionSupported } from '@/lib/modelCatalog';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const ModelSelector = () => {
  const { action, model, setModel } = useTranscriptionStore();
  const { installedModels, isDesktop } = useDesktopSetup();
  const installedSet = new Set(installedModels);

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground hidden sm:block">
        Modelo
      </label>
      <Select value={model} onValueChange={setModel}>
        <SelectTrigger className="w-28 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODEL_CATALOG.map((entry) => {
            const unavailableOnDesktop = isDesktop && !installedSet.has(entry.model);
            const unsupportedForAction = !isModelActionSupported(entry.model, action);
            const disabled = unavailableOnDesktop || unsupportedForAction;

            let suffix = '';
            if (unavailableOnDesktop) {
              suffix = ' • instalar';
            } else if (unsupportedForAction) {
              suffix = ' • sem tradução';
            }

            return (
              <SelectItem
                key={entry.model}
                value={entry.model}
                disabled={disabled}
              >
                {entry.label}{suffix}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
