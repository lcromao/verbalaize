import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const ActionSelector = () => {
  const { action, setAction } = useTranscriptionStore();

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground hidden sm:block">
        Ação
      </label>
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger className="w-40 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="transcribe">Transcrever</SelectItem>
          <SelectItem value="translate_english">Para Inglês</SelectItem>
          <SelectItem value="translate_language">Outro idioma</SelectItem>
        </SelectContent>
      </Select>

      {action === 'translate_language' && (
        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
