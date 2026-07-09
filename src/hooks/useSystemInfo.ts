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

// A cada 10 atualizações incrementa 1 PATCH; a cada 30 (3 patches) incrementa 1 MINOR
export function computeVersion(totalRows: number): string {
  const minor = Math.floor(totalRows / 30);
  const patch = Math.floor((totalRows % 30) / 10);
  return `1.${minor}.${patch}`;
}

export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdminPrincipal } = useAuth();

  const fetchSystemInfo = async () => {
    try {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('system_info')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('system_info')
          .select('*', { count: 'exact', head: true }),
      ]);

      setSystemInfo(data ?? null);
      setTotalUpdates(count ?? 0);
    } catch (error) {
      console.error('Erro ao buscar versão do sistema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Registra uma atualização — versão calculada automaticamente */
  const registerUpdate = async (notes: string, updatedBy: string): Promise<boolean> => {
    if (!isAdminPrincipal) {
      toast.error('Apenas administradores podem registrar atualizações');
      return false;
    }

    try {
      const nextTotal = totalUpdates + 1;
      const version = computeVersion(nextTotal);

      const { error } = await supabase.from('system_info').insert({
        system_version: version,
        release_notes: notes || null,
        updated_by: updatedBy,
      });

      if (error) throw error;

      toast.success(`Atualização registrada — versão ${version}`);
      await fetchSystemInfo();
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar atualização:', error);
      toast.error('Erro ao registrar atualização: ' + error.message);
      return false;
    }
  };

  /** Mantido para retrocompatibilidade (LayoutCotacaoHarmony usa createNewVersion) */
  const createNewVersion = async (version: string, notes: string, updatedBy: string) => {
    if (!isAdminPrincipal) {
      toast.error('Apenas administradores podem atualizar a versão');
      return false;
    }
    try {
      const { error } = await supabase.from('system_info').insert({
        system_version: version,
        release_notes: notes,
        updated_by: updatedBy,
      });
      if (error) throw error;
      toast.success('Nova versão registrada com sucesso!');
      await fetchSystemInfo();
      return true;
    } catch (error: any) {
      toast.error('Erro ao registrar versão: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const nextVersion = computeVersion(totalUpdates + 1);
  const updatesInCurrentPatch = totalUpdates % 10;
  const updatesUntilNextPatch = 10 - updatesInCurrentPatch;
  const patchesInCurrentMinor = Math.floor((totalUpdates % 30) / 10);
  const patchesUntilNextMinor = 3 - patchesInCurrentMinor;

  return {
    systemInfo,
    totalUpdates,
    nextVersion,
    updatesUntilNextPatch,
    patchesUntilNextMinor,
    isLoading,
    registerUpdate,
    createNewVersion,
    refetch: fetchSystemInfo,
  };
}
