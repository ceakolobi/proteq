import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Mensalidade, 
  MensalidadeWithDetails, 
  FinanceiroDashboardStats,
  InadimplenteInfo,
  ConfiguracoesFinanceiras 
} from '@/types/financeiro';

export function useFinanceiro() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinanceiroDashboardStats | null>(null);
  const [mensalidades, setMensalidades] = useState<MensalidadeWithDetails[]>([]);
  const [inadimplentes, setInadimplentes] = useState<InadimplenteInfo[]>([]);
  const [config, setConfig] = useState<ConfiguracoesFinanceiras | null>(null);

  // Buscar estatísticas do dashboard
  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      // Buscar mensalidades do mês
      const { data: mensalidadesMes, error } = await supabase
        .from('mensalidades')
        .select('*')
        .gte('mes_referencia', primeiroDiaMes)
        .lte('mes_referencia', ultimoDiaMes);

      if (error) throw error;

      // Calcular estatísticas
      const pendentes = mensalidadesMes?.filter(m => m.status === 'pendente') || [];
      const pagas = mensalidadesMes?.filter(m => m.status === 'paga') || [];
      const atrasadas = mensalidadesMes?.filter(m => m.status === 'atrasada') || [];
      const aVencer = mensalidadesMes?.filter(m => m.status === 'a_vencer') || [];

      // Buscar todas as mensalidades atrasadas (não apenas do mês)
      const { data: todasAtrasadas } = await supabase
        .from('mensalidades')
        .select('associado_id, valor_final')
        .eq('status', 'atrasada');

      const associadosUnicos = new Set(todasAtrasadas?.map(m => m.associado_id) || []);

      setStats({
        totalAReceber: pendentes.reduce((acc, m) => acc + Number(m.valor_final), 0) + aVencer.reduce((acc, m) => acc + Number(m.valor_final), 0),
        totalRecebido: pagas.reduce((acc, m) => acc + Number(m.valor_final), 0),
        totalInadimplencia: (todasAtrasadas || []).reduce((acc, m) => acc + Number(m.valor_final), 0),
        totalAVencer: aVencer.reduce((acc, m) => acc + Number(m.valor_final), 0),
        mensalidadesPendentes: pendentes.length,
        mensalidadesPagas: pagas.length,
        mensalidadesAtrasadas: atrasadas.length,
        mensalidadesAVencer: aVencer.length,
        associadosInadimplentes: associadosUnicos.size,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Buscar mensalidades com detalhes
  const fetchMensalidades = useCallback(async (filters?: {
    status?: string;
    mesReferencia?: string;
    associadoId?: string;
  }) => {
    if (!user) return;
    setLoading(true);

    try {
      let query = supabase
        .from('mensalidades')
        .select(`
          *,
          associados!inner(nome_completo, regiao_id),
          veiculos!inner(placa, modelo)
        `)
        .order('data_vencimento', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.mesReferencia) {
        query = query.eq('mes_referencia', filters.mesReferencia);
      }
      if (filters?.associadoId) {
        query = query.eq('associado_id', filters.associadoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mensalidadesFormatadas: MensalidadeWithDetails[] = (data || []).map((m: any) => ({
        ...m,
        associado_nome: m.associados?.nome_completo,
        veiculo_placa: m.veiculos?.placa,
        veiculo_modelo: m.veiculos?.modelo,
        dias_atraso: m.status === 'atrasada' 
          ? Math.floor((Date.now() - new Date(m.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }));

      setMensalidades(mensalidadesFormatadas);
    } catch (error) {
      console.error('Erro ao buscar mensalidades:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Buscar inadimplentes
  const fetchInadimplentes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          associado_id,
          valor_final,
          data_vencimento,
          associados!inner(nome_completo, regiao_id, regioes(nome))
        `)
        .eq('status', 'atrasada');

      if (error) throw error;

      // Agrupar por associado
      const agrupado: Record<string, InadimplenteInfo> = {};
      
      (data || []).forEach((m: any) => {
        const diasAtraso = Math.floor(
          (Date.now() - new Date(m.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (!agrupado[m.associado_id]) {
          agrupado[m.associado_id] = {
            associado_id: m.associado_id,
            associado_nome: m.associados?.nome_completo || 'N/A',
            regiao_nome: (m.associados as any)?.regioes?.nome || undefined,
            total_devido: 0,
            mensalidades_atrasadas: 0,
            dias_maior_atraso: 0,
            status_financeiro: 'regular',
          };
        }

        agrupado[m.associado_id].total_devido += Number(m.valor_final);
        agrupado[m.associado_id].mensalidades_atrasadas += 1;
        agrupado[m.associado_id].dias_maior_atraso = Math.max(
          agrupado[m.associado_id].dias_maior_atraso,
          diasAtraso
        );
      });

      // Classificar status financeiro
      Object.values(agrupado).forEach(i => {
        if (i.dias_maior_atraso > 60 || i.mensalidades_atrasadas >= 3) {
          i.status_financeiro = 'critico';
        } else if (i.dias_maior_atraso > 30 || i.mensalidades_atrasadas >= 2) {
          i.status_financeiro = 'atencao';
        }
      });

      setInadimplentes(Object.values(agrupado).sort((a, b) => b.dias_maior_atraso - a.dias_maior_atraso));
    } catch (error) {
      console.error('Erro ao buscar inadimplentes:', error);
    }
  }, [user]);

  // Buscar configurações financeiras
  const fetchConfig = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('configuracoes_financeiras')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  }, [user]);

  // Registrar pagamento
  const registrarPagamento = async (
    mensalidadeId: string,
    formaPagamento: string,
    dataPagamento: string,
    observacoes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('mensalidades')
        .update({
          status: 'paga',
          forma_pagamento: formaPagamento,
          data_pagamento: dataPagamento,
          observacoes,
        })
        .eq('id', mensalidadeId);

      if (error) throw error;

      // Geração automática de contrato (backend). Não bloqueia o fluxo de pagamento.
      try {
        await supabase.functions.invoke('generate-contract', {
          body: { mensalidadeId },
        });
      } catch (e) {
        console.warn('Falha ao disparar geração de contrato:', e);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return { success: false, error };
    }
  };

  // Alterar status da mensalidade
  const alterarStatusMensalidade = async (mensalidadeId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('mensalidades')
        .update({ status: novoStatus })
        .eq('id', mensalidadeId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      return { success: false, error };
    }
  };

  // Gerar mensalidades do mês
  const gerarMensalidadesMes = async (mesReferencia: string) => {
    try {
      const { data, error } = await supabase.rpc('gerar_mensalidades_mes', {
        p_mes_referencia: mesReferencia,
      });

      if (error) throw error;
      return { success: true, count: data };
    } catch (error) {
      console.error('Erro ao gerar mensalidades:', error);
      return { success: false, error };
    }
  };

  // Atualizar mensalidades atrasadas (usa a nova função que também atualiza 'a_vencer')
  const atualizarAtrasadas = async () => {
    try {
      const { data, error } = await supabase.rpc('atualizar_status_mensalidades');
      if (error) throw error;
      return { success: true, count: data };
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchConfig();
    }
  }, [user, fetchStats, fetchConfig]);

  return {
    loading,
    stats,
    mensalidades,
    inadimplentes,
    config,
    fetchStats,
    fetchMensalidades,
    fetchInadimplentes,
    fetchConfig,
    registrarPagamento,
    alterarStatusMensalidade,
    gerarMensalidadesMes,
    atualizarAtrasadas,
  };
}
