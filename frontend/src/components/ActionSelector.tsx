import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const LANGUAGES = [
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Espanhol' },
  { code: 'fr', name: 'Francês' },
  { code: 'de', name: 'Alemão' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: 'Japonês' },
  { code: 'ko', name: 'Coreano' },
  { code: 'zh', name: 'Chinês' },
  { code: 'ru', name: 'Russo' },
  { code: 'ar', name: 'Árabe' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Holandês' },
  { code: 'sv', name: 'Sueco' },
  { code: 'no', name: 'Norueguês' },
  { code: 'da', name: 'Dinamarquês' },
  { code: 'fi', name: 'Finlandês' },
  { code: 'pl', name: 'Polonês' },
  { code: 'tr', name: 'Turco' },
  { code: 'he', name: 'Hebraico' },
  { code: 'th', name: 'Tailandês' },
];

export const ActionSelector = () => {
  const { action, setAction, targetLanguage, setTargetLanguage } = useTranscriptionStore();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Ação:
      </label>
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="transcribe">Transcrever</SelectItem>
          <SelectItem value="translate_english">Traduzir para Inglês</SelectItem>
          <SelectItem value="translate_language">Traduzir para outro idioma</SelectItem>
        </SelectContent>
      </Select>
      
      {action === 'translate_language' && (
        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione o idioma" />
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