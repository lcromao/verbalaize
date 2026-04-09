import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const ModelSelector = () => {
  const { model, setModel } = useTranscriptionStore();

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
          <SelectItem value="small">Small</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="turbo">Turbo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};