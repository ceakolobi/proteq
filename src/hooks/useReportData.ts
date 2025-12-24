import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Associado = Tables<'associados'>;
type Pagamento = Tables<'pagamentos'>;
type Regiao = Tables<'regioes'>;

export interface ReportFilters {
  regiaoId?: string;
  consultorId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface RegionalReportItem {
  regiao_id: string;
  regiao_nome: string;
  total_associados: number;
  associados_ativos: number;
  total_veiculos: number;
  faturamento_mensal: number;
}

export interface ConsultorReportItem {
  consultor_id: string;
  consultor_nome: string;
  regiao_nome: string;
  total_associados: number;
  associados_ativos: number;
  total_veiculos: number;
  leads_convertidos: number;
  leads_total: number;
  taxa_conversao: number;
}

export interface InadimplenciaReportItem {
  associado_id: string;
  associado_nome: string;
  cpf: string;
  telefone: string;
  consultor_nome: string;
  regiao_nome: string;
  valor_devido: number;
  dias_atraso: number;
  ultimo_pagamento: string | null;
}

export interface SinistroReportItem {
  id: string;
  data_acionamento: string;
  associado_nome: string;
  veiculo_info: string;
  origem: string | null;
  destino: string | null;
  km_utilizado: number;
  observacoes: string | null;
}

export function useReportData() {
  const { user, profile, isAdminPrincipal, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !isAdminRegional;

  // Get allowed region IDs for filtering
  const getAllowedRegiaoIds = useCallback(async (): Promise<string[] | null> => {
    if (isAdminPrincipal) return null; // null means all

    if (isAdminRegional && profile?.sede_id) {
      const { data } = await supabase
        .from('regioes')
        .select('id')
        .eq('sede_id', profile.sede_id);
      return data?.map(r => r.id) || [];
    }

    if (isConsultor && profile?.regiao_id) {
      return [profile.regiao_id];
    }

    return [];
  }, [isAdminPrincipal, isAdminRegional, isConsultor, profile]);

  // Regional Report
  const fetchRegionalReport = useCallback(async (filters: ReportFilters): Promise<RegionalReportItem[]> => {
    setIsLoading(true);
    try {
      const allowedRegiaoIds = await getAllowedRegiaoIds();

      // Fetch regioes
      let regioesQuery = supabase.from('regioes').select('*').eq('ativo', true);
      if (allowedRegiaoIds) {
        regioesQuery = regioesQuery.in('id', allowedRegiaoIds);
      }
      if (filters.regiaoId && filters.regiaoId !== 'all') {
        regioesQuery = regioesQuery.eq('id', filters.regiaoId);
      }
      const { data: regioes } = await regioesQuery;

      if (!regioes?.length) return [];

      const regiaoIds = regioes.map(r => r.id);

      // Fetch associados
      let assocQuery = supabase.from('associados').select('id, regiao_id, status').in('regiao_id', regiaoIds);
      const { data: associados } = await assocQuery;

      // Fetch veiculos
      const associadoIds = associados?.map(a => a.id) || [];
      const { data: veiculos } = await supabase
        .from('veiculos')
        .select('id, associado_id, mensalidade, protecao_ativa')
        .in('associado_id', associadoIds);

      // Build report
      return regioes.map(regiao => {
        const regAssoc = associados?.filter(a => a.regiao_id === regiao.id) || [];
        const regAssocIds = regAssoc.map(a => a.id);
        const regVeiculos = veiculos?.filter(v => regAssocIds.includes(v.associado_id)) || [];

        return {
          regiao_id: regiao.id,
          regiao_nome: regiao.nome,
          total_associados: regAssoc.length,
          associados_ativos: regAssoc.filter(a => a.status === 'ativo').length,
          total_veiculos: regVeiculos.length,
          faturamento_mensal: regVeiculos
            .filter(v => v.protecao_ativa)
            .reduce((sum, v) => sum + (v.mensalidade || 0), 0),
        };
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAllowedRegiaoIds]);

  // Consultor Report
  const fetchConsultorReport = useCallback(async (filters: ReportFilters): Promise<ConsultorReportItem[]> => {
    setIsLoading(true);
    try {
      const allowedRegiaoIds = await getAllowedRegiaoIds();

      // Fetch consultores (profiles with consultor_vendas role)
      let profilesQuery = supabase.from('profiles').select('id, nome_completo, regiao_id');
      if (allowedRegiaoIds) {
        profilesQuery = profilesQuery.in('regiao_id', allowedRegiaoIds);
      }
      if (isConsultor) {
        profilesQuery = profilesQuery.eq('id', user!.id);
      }
      if (filters.consultorId && filters.consultorId !== 'all') {
        profilesQuery = profilesQuery.eq('id', filters.consultorId);
      }
      const { data: profiles } = await profilesQuery;

      // Filter to only consultores by checking roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');
      const consultorIds = roles?.map(r => r.user_id) || [];
      const consultores = profiles?.filter(p => consultorIds.includes(p.id)) || [];

      if (!consultores.length) return [];

      // Fetch regioes for names
      const regiaoIds = [...new Set(consultores.map(c => c.regiao_id).filter(Boolean))];
      const { data: regioes } = await supabase.from('regioes').select('id, nome').in('id', regiaoIds as string[]);
      const regiaoMap = new Map(regioes?.map(r => [r.id, r.nome]) || []);

      // Fetch associados
      const { data: associados } = await supabase
        .from('associados')
        .select('id, consultor_id, status')
        .in('consultor_id', consultores.map(c => c.id));

      // Fetch veiculos
      const associadoIds = associados?.map(a => a.id) || [];
      const { data: veiculos } = await supabase
        .from('veiculos')
        .select('associado_id')
        .in('associado_id', associadoIds);

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('consultor_id, convertido')
        .in('consultor_id', consultores.map(c => c.id));

      // Build report
      return consultores.map(consultor => {
        const consAssoc = associados?.filter(a => a.consultor_id === consultor.id) || [];
        const consAssocIds = consAssoc.map(a => a.id);
        const consVeiculos = veiculos?.filter(v => consAssocIds.includes(v.associado_id)) || [];
        const consLeads = leads?.filter(l => l.consultor_id === consultor.id) || [];
        const leadsConvertidos = consLeads.filter(l => l.convertido).length;

        return {
          consultor_id: consultor.id,
          consultor_nome: consultor.nome_completo,
          regiao_nome: regiaoMap.get(consultor.regiao_id || '') || 'Sem região',
          total_associados: consAssoc.length,
          associados_ativos: consAssoc.filter(a => a.status === 'ativo').length,
          total_veiculos: consVeiculos.length,
          leads_convertidos: leadsConvertidos,
          leads_total: consLeads.length,
          taxa_conversao: consLeads.length > 0 ? (leadsConvertidos / consLeads.length) * 100 : 0,
        };
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAllowedRegiaoIds, isConsultor, user]);

  // Inadimplencia Report
  const fetchInadimplenciaReport = useCallback(async (filters: ReportFilters): Promise<InadimplenciaReportItem[]> => {
    setIsLoading(true);
    try {
      const allowedRegiaoIds = await getAllowedRegiaoIds();

      // Fetch inadimplentes
      let assocQuery = supabase.from('associados').select('*').eq('status', 'inadimplente');
      if (allowedRegiaoIds) {
        assocQuery = assocQuery.in('regiao_id', allowedRegiaoIds);
      }
      if (isConsultor) {
        assocQuery = assocQuery.eq('consultor_id', user!.id);
      }
      if (filters.regiaoId && filters.regiaoId !== 'all') {
        assocQuery = assocQuery.eq('regiao_id', filters.regiaoId);
      }
      const { data: associados } = await assocQuery;

      if (!associados?.length) return [];

      // Fetch consultores
      const consultorIds = [...new Set(associados.map(a => a.consultor_id).filter(Boolean))];
      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .in('id', consultorIds as string[]);
      const consultorMap = new Map(consultores?.map(c => [c.id, c.nome_completo]) || []);

      // Fetch regioes
      const regiaoIds = [...new Set(associados.map(a => a.regiao_id).filter(Boolean))];
      const { data: regioes } = await supabase.from('regioes').select('id, nome').in('id', regiaoIds as string[]);
      const regiaoMap = new Map(regioes?.map(r => [r.id, r.nome]) || []);

      // Fetch pagamentos pendentes
      const { data: pagamentos } = await supabase
        .from('pagamentos')
        .select('*')
        .in('associado_id', associados.map(a => a.id))
        .in('status', ['pendente', 'atrasado'])
        .order('data_vencimento', { ascending: true });

      // Build report
      return associados.map(assoc => {
        const assocPagamentos = pagamentos?.filter(p => p.associado_id === assoc.id) || [];
        const valorDevido = assocPagamentos.reduce((sum, p) => sum + p.valor, 0);
        const oldestPending = assocPagamentos[0];
        const diasAtraso = oldestPending 
          ? Math.floor((new Date().getTime() - new Date(oldestPending.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          associado_id: assoc.id,
          associado_nome: assoc.nome_completo,
          cpf: assoc.cpf,
          telefone: assoc.telefone,
          consultor_nome: consultorMap.get(assoc.consultor_id || '') || 'Sem consultor',
          regiao_nome: regiaoMap.get(assoc.regiao_id || '') || 'Sem região',
          valor_devido: valorDevido,
          dias_atraso: Math.max(0, diasAtraso),
          ultimo_pagamento: null, // Would need additional query
        };
      }).sort((a, b) => b.dias_atraso - a.dias_atraso);
    } finally {
      setIsLoading(false);
    }
  }, [getAllowedRegiaoIds, isConsultor, user]);

  // Sinistro Report
  const fetchSinistroReport = useCallback(async (filters: ReportFilters): Promise<SinistroReportItem[]> => {
    setIsLoading(true);
    try {
      const allowedRegiaoIds = await getAllowedRegiaoIds();

      // Get allowed associado IDs
      let assocQuery = supabase.from('associados').select('id, nome_completo, regiao_id');
      if (allowedRegiaoIds) {
        assocQuery = assocQuery.in('regiao_id', allowedRegiaoIds);
      }
      if (isConsultor) {
        assocQuery = assocQuery.eq('consultor_id', user!.id);
      }
      const { data: associados } = await assocQuery;
      const associadoIds = associados?.map(a => a.id) || [];
      const associadoMap = new Map(associados?.map(a => [a.id, a.nome_completo]) || []);

      if (!associadoIds.length) return [];

      // Fetch acionamentos
      let acionQuery = supabase
        .from('acionamentos_guincho')
        .select('*')
        .in('associado_id', associadoIds)
        .order('data_acionamento', { ascending: false });
      
      if (filters.dateFrom) {
        acionQuery = acionQuery.gte('data_acionamento', filters.dateFrom);
      }
      if (filters.dateTo) {
        acionQuery = acionQuery.lte('data_acionamento', filters.dateTo);
      }
      
      const { data: acionamentos } = await acionQuery;

      if (!acionamentos?.length) return [];

      // Fetch veiculos
      const veiculoIds = [...new Set(acionamentos.map(a => a.veiculo_id))];
      const { data: veiculos } = await supabase
        .from('veiculos')
        .select('id, marca, modelo, placa')
        .in('id', veiculoIds);
      const veiculoMap = new Map(veiculos?.map(v => [v.id, `${v.marca} ${v.modelo} - ${v.placa}`]) || []);

      return acionamentos.map(acion => ({
        id: acion.id,
        data_acionamento: acion.data_acionamento,
        associado_nome: associadoMap.get(acion.associado_id) || 'Desconhecido',
        veiculo_info: veiculoMap.get(acion.veiculo_id) || 'Desconhecido',
        origem: acion.origem,
        destino: acion.destino,
        km_utilizado: acion.km_utilizado,
        observacoes: acion.observacoes,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [getAllowedRegiaoIds, isConsultor, user]);

  return {
    isLoading,
    fetchRegionalReport,
    fetchConsultorReport,
    fetchInadimplenciaReport,
    fetchSinistroReport,
  };
}
