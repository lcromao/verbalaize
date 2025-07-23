import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';

export const useApiHealth = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      await ApiService.healthCheck();
      setIsHealthy(true);
    } catch (error) {
      setIsHealthy(false);
      toast({
        title: "Servidor não disponível",
        description: "Não foi possível conectar ao servidor de transcrição. Verifique se o backend está rodando.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return { isHealthy, isChecking, checkHealth };
};
