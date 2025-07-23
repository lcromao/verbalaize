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
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Modelo:
      </label>
      <Select value={model} onValueChange={setModel}>
        <SelectTrigger className="w-32">
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