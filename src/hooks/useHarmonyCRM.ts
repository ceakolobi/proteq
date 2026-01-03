import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VeiculoCRM {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  ano_modelo?: number;
  tipo: string;
  valor_fipe?: number;
  codigo_fipe?: string;
  cor?: string;
  combustivel?: string;
  chassi?: string;
  renavam?: string;
}

interface CotacaoCRM {
  placa?: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo?: number;
  tipo_bem: string;
  valor_fipe: number;
  valor_bem: number;
  mensalidade: number;
  participacao: number;
  cota_id?: string;
  cota_nome?: string;
  consultor_id: string;
  consultor_nome?: string;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_whatsapp?: string;
  observacoes?: string;
}

interface ConsultorPerfilCRM {
  id: string;
  nome: string;
  email: string;
  roles: string[];
  regiao_id?: string;
  sede_id?: string;
  company_id?: string;
  ativo: boolean;
}

interface CRMResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function useHarmonyCRM() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callCRM = useCallback(async <T>(
    route: string,
    data?: Record<string, unknown>
  ): Promise<CRMResponse<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('harmony-crm', {
        body: { route, ...data },
      });

      if (fnError) {
        console.error('[useHarmonyCRM] Function error:', fnError);
        const errorMsg = fnError.message || 'Erro ao comunicar com CRM';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (!response?.success) {
        const errorMsg = response?.error || 'Erro desconhecido do CRM';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return response as CRMResponse<T>;
    } catch (err) {
      console.error('[useHarmonyCRM] Unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buscarVeiculoPorPlaca = useCallback(async (placa: string): Promise<VeiculoCRM | null> => {
    const result = await callCRM<VeiculoCRM>('veiculo', { placa });
    
    if (!result.success || !result.data) {
      if (result.error) {
        toast.error(result.error);
      }
      return null;
    }

    return result.data;
  }, [callCRM]);

  const enviarCotacao = useCallback(async (cotacao: CotacaoCRM): Promise<boolean> => {
    const result = await callCRM<{ id: string }>('cotacao', { cotacao });
    
    if (!result.success) {
      toast.error(result.error || 'Erro ao enviar cotação para o CRM');
      return false;
    }

    toast.success(result.message || 'Cotação enviada com sucesso');
    return true;
  }, [callCRM]);

  const buscarPerfilConsultor = useCallback(async (): Promise<ConsultorPerfilCRM | null> => {
    const result = await callCRM<ConsultorPerfilCRM>('perfil');
    
    if (!result.success || !result.data) {
      // Don't show toast for profile fetch - it's a background operation
      console.warn('[useHarmonyCRM] Profile fetch failed:', result.error);
      return null;
    }

    return result.data;
  }, [callCRM]);

  const verificarConexao = useCallback(async (): Promise<boolean> => {
    const result = await callCRM<{ message: string }>('health');
    return result.success;
  }, [callCRM]);

  return {
    isLoading,
    error,
    buscarVeiculoPorPlaca,
    enviarCotacao,
    buscarPerfilConsultor,
    verificarConexao,
  };
}

export type { VeiculoCRM, CotacaoCRM, ConsultorPerfilCRM };
