import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';
import { getPreferredModelForAction, isModelActionSupported } from '@/lib/modelCatalog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const ActionSelector = () => {
  const { action, model, setAction, setModel } = useTranscriptionStore();
  const { installedModels, isDesktop } = useDesktopSetup();
  const availableModels = isDesktop
    ? installedModels
    : (['small', 'medium', 'turbo'] as const);
  const canTranslate =
    !isDesktop ||
    installedModels.some((model) =>
      isModelActionSupported(model, 'translate_english'),
    );

  const handleActionChange = (nextAction: typeof action) => {
    setAction(nextAction);

    const preferredModel = getPreferredModelForAction(
      nextAction,
      [...availableModels],
    );

    if (preferredModel && preferredModel !== model && !isModelActionSupported(model, nextAction)) {
      setModel(preferredModel);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground hidden sm:block">
        Ação
      </label>
      <Select value={action} onValueChange={handleActionChange}>
        <SelectTrigger className="w-40 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="transcribe">Transcrever</SelectItem>
          <SelectItem value="translate_english" disabled={!canTranslate}>
            {canTranslate ? 'Para Inglês' : 'Para Inglês • instale Small/Medium'}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
