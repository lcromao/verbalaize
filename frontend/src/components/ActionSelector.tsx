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
        </SelectContent>
      </Select>
    </div>
  );
};
