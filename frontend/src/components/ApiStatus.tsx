import { useApiHealth } from '@/hooks/useApiHealth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const ApiStatus = () => {
  const { isHealthy, isChecking, checkHealth } = useApiHealth();

  const getStatusConfig = () => {
    if (isChecking) {
      return {
        variant: 'secondary' as const,
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: 'Verificando...',
        color: 'text-muted-foreground'
      };
    }
    
    if (isHealthy === true) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="w-3 h-3" />,
        text: 'API Online',
        color: 'text-green-600'
      };
    }
    
    if (isHealthy === false) {
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="w-3 h-3" />,
        text: 'API Offline',
        color: 'text-red-600'
      };
    }

    return {
      variant: 'secondary' as const,
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: 'Verificando...',
      color: 'text-muted-foreground'
    };
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        <span className={config.color}>{config.text}</span>
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={checkHealth}
        disabled={isChecking}
        className="h-6 w-6 p-0"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};
