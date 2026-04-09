import { useApiHealth } from '@/hooks/useApiHealth';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const ApiStatus = () => {
  const { isHealthy, isChecking, checkHealth } = useApiHealth();

  const dot = isChecking
    ? 'bg-muted-foreground animate-pulse'
    : isHealthy === true
    ? 'bg-emerald-500'
    : isHealthy === false
    ? 'bg-destructive'
    : 'bg-muted-foreground animate-pulse';

  const label = isChecking
    ? 'Verificando'
    : isHealthy === true
    ? 'Online'
    : isHealthy === false
    ? 'Offline'
    : 'Verificando';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span>{label}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={checkHealth}
        disabled={isChecking}
        className="w-6 h-6 p-0 text-muted-foreground"
        aria-label="Verificar API"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};
