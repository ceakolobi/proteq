import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SystemInfo {
  id: string;
  system_version: string;
  release_date: string;
  release_notes: string | null;
  updated_by: string | null;
  created_at: string;
}

export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdminPrincipal } = useAuth();

  const fetchSystemInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_info')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setSystemInfo(data);
    } catch (error) {
      console.error('Erro ao buscar versão do sistema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewVersion = async (version: string, notes: string, updatedBy: string) => {
    if (!isAdminPrincipal) {
      toast.error('Apenas administradores podem atualizar a versão');
      return false;
    }

    try {
      const { error } = await supabase
        .from('system_info')
        .insert({
          system_version: version,
          release_notes: notes,
          updated_by: updatedBy,
        });

      if (error) throw error;
      
      toast.success('Nova versão registrada com sucesso!');
      await fetchSystemInfo();
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar versão:', error);
      toast.error('Erro ao registrar versão: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  return {
    systemInfo,
    isLoading,
    createNewVersion,
    refetch: fetchSystemInfo,
  };
}
