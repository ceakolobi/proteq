import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Cotacao, CotacaoContato, TipoBem } from '@/types/cotacao';

interface CotacaoWithRelations extends Cotacao {
  lead_nome?: string;
  lead_email?: string;
  lead_telefone?: string;
  regiao_nome?: string;
  consultor_nome?: string;
  cota_nome?: string;
  contatos?: CotacaoContato[];
  cliente_nome?: string;
  cliente_email?: string;
  cliente_whatsapp?: string;
  proposta_enviada_em?: string;
}

interface UseCotacoesResult {
  cotacoes: CotacaoWithRelations[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  createCotacao: (data: Partial<Cotacao>) => Promise<Cotacao | null>;
  updateCotacao: (id: string, data: Partial<Cotacao>) => Promise<boolean>;
  addContato: (cotacaoId: string, tipo: string, descricao: string) => Promise<boolean>;
  aprovarCotacao: (cotacaoId: string) => Promise<boolean>;
  getMensalidadeByTipo: (cotaId: string, tipoBem: TipoBem) => Promise<number>;
}

export function useCotacoes(): UseCotacoesResult {
  const { user, profile, isAdminPrincipal, hasRole } = useAuth();
  const [cotacoes, setCotacoes] = useState<CotacaoWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isConsultor = hasRole('consultor_vendas');
  const isAdminRegional = hasRole('admin_regional');

  const fetchCotacoes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('cotacoes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch related data
      const cotacoesWithRelations: CotacaoWithRelations[] = await Promise.all(
        (data || []).map(async (cotacao: Cotacao) => {
          let lead_nome: string | undefined = undefined;
          let lead_email: string | undefined = undefined;
          let lead_telefone: string | undefined = undefined;
          let regiao_nome: string | undefined = undefined;
          
          if (cotacao.lead_id) {
            const { data: lead } = await supabase
              .from('leads')
              .select('nome, email, telefone')
              .eq('id', cotacao.lead_id)
              .maybeSingle();
            lead_nome = lead?.nome;
            lead_email = lead?.email || undefined;
            lead_telefone = lead?.telefone || undefined;
          }
          
          if (cotacao.regiao_id) {
            const { data: regiao } = await supabase
              .from('regioes')
              .select('nome')
              .eq('id', cotacao.regiao_id)
              .maybeSingle();
            regiao_nome = regiao?.nome;
          }

          // Fetch contatos
          const { data: contatos } = await supabase
            .from('cotacao_contatos')
            .select('*')
            .eq('cotacao_id', cotacao.id)
            .order('data_contato', { ascending: false });

          // Fetch cota nome
          let cota_nome: string | undefined = undefined;
          if (cotacao.cota_id) {
            const { data: cota } = await supabase
              .from('cotas')
              .select('cota_nome')
              .eq('id', cotacao.cota_id)
              .maybeSingle();
            cota_nome = cota?.cota_nome;
          }

          return {
            ...cotacao,
            lead_nome,
            lead_email,
            lead_telefone,
            regiao_nome,
            cota_nome,
            contatos: contatos || [],
          };
        })
      );

      setCotacoes(cotacoesWithRelations);
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
      toast.error('Erro ao carregar cotações');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCotacoes();
  }, [fetchCotacoes]);

  const createCotacao = async (data: Partial<Cotacao>): Promise<Cotacao | null> => {
    if (!user) return null;

    try {
      const cotacaoData = {
        tipo_bem: data.tipo_bem!,
        marca: data.marca!,
        modelo: data.modelo!,
        ano_fabricacao: data.ano_fabricacao!,
        valor_bem: data.valor_bem!,
        metodo_valoracao: data.metodo_valoracao || 'fipe',
        consultor_id: user.id,
        regiao_id: data.regiao_id || profile?.regiao_id || null,
        status: data.status || 'novo',
        lead_id: data.lead_id || null,
        placa: data.placa || null,
        chassi: data.chassi || null,
        ano_modelo: data.ano_modelo || null,
        categoria: data.categoria || null,
        cor: data.cor || null,
        renavam: data.renavam || null,
        valor_fipe: data.valor_fipe || null,
        codigo_fipe: data.codigo_fipe || null,
        usuario_informou_valor: data.usuario_informou_valor || null,
        data_valor_informado: data.data_valor_informado || null,
        url_nota_fiscal: data.url_nota_fiscal || null,
        cota_id: data.cota_id || null,
        mensalidade: data.mensalidade || null,
        participacao: data.participacao || null,
        carro_reserva_dias: data.carro_reserva_dias ?? 15,
        carro_reserva_adicional: data.carro_reserva_adicional ?? 0,
        observacoes: data.observacoes || null,
      };

      const { data: newCotacao, error } = await supabase
        .from('cotacoes')
        .insert([cotacaoData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Cotação criada com sucesso');
      await fetchCotacoes();
      return newCotacao;
    } catch (error: any) {
      console.error('Erro ao criar cotação:', error);
      toast.error(error.message || 'Erro ao criar cotação');
      return null;
    }
  };

  const updateCotacao = async (id: string, data: Partial<Cotacao>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Cotação atualizada');
      await fetchCotacoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar cotação:', error);
      toast.error(error.message || 'Erro ao atualizar cotação');
      return false;
    }
  };

  const addContato = async (cotacaoId: string, tipo: string, descricao: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cotacao_contatos')
        .insert([{
          cotacao_id: cotacaoId,
          usuario_id: user.id,
          tipo: tipo as 'ligacao' | 'whatsapp' | 'retorno' | 'reuniao' | 'email' | 'visita',
          descricao,
        }]);

      if (error) throw error;

      toast.success('Contato registrado');
      await fetchCotacoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar contato:', error);
      toast.error(error.message || 'Erro ao registrar contato');
      return false;
    }
  };

  const aprovarCotacao = async (cotacaoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Atualizar status da cotação
      const { error } = await supabase
        .from('cotacoes')
        .update({
          status: 'aprovado',
          aprovada_em: new Date().toISOString(),
          aprovada_por: user.id,
        })
        .eq('id', cotacaoId);

      if (error) throw error;

      // Buscar cotação para criar vistoria
      const { data: cotacao } = await supabase
        .from('cotacoes')
        .select('*')
        .eq('id', cotacaoId)
        .single();

      if (cotacao) {
        // Criar proposta vinculada
        const { data: proposta, error: propostaError } = await supabase
          .from('propostas')
          .insert({
            consultor_id: cotacao.consultor_id,
            lead_id: cotacao.lead_id,
            veiculo_marca: cotacao.marca,
            veiculo_modelo: cotacao.modelo,
            veiculo_ano: cotacao.ano_fabricacao,
            veiculo_tipo: cotacao.tipo_bem,
            valor_fipe: cotacao.valor_bem,
            cota_id: cotacao.cota_id,
            mensalidade: cotacao.mensalidade,
            participacao: cotacao.participacao,
            carro_reserva_dias: cotacao.carro_reserva_dias,
            carro_reserva_adicional: cotacao.carro_reserva_adicional,
            status: 'aceita',
            aceita_em: new Date().toISOString(),
          })
          .select()
          .single();

        if (propostaError) {
          console.error('Erro ao criar proposta:', propostaError);
        } else if (proposta) {
          // Atualizar cotação com proposta_id
          await supabase
            .from('cotacoes')
            .update({ proposta_id: proposta.id })
            .eq('id', cotacaoId);
        }
      }

      toast.success('Cotação aprovada! Processo de vistoria iniciado.');
      await fetchCotacoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao aprovar cotação:', error);
      toast.error(error.message || 'Erro ao aprovar cotação');
      return false;
    }
  };

  const getMensalidadeByTipo = async (cotaId: string, tipoBem: TipoBem): Promise<number> => {
    try {
      const { data: cota } = await supabase
        .from('cotas')
        .select('*')
        .eq('id', cotaId)
        .single();

      if (!cota) return 0;

      switch (tipoBem) {
        case 'carro': return Number(cota.valor_carro) || 0;
        case 'moto': return Number(cota.valor_moto) || 0;
        case 'pickup': return Number(cota.valor_camionete) || 0;
        default: return Number(cota.valor_camionete) || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar mensalidade:', error);
      return 0;
    }
  };

  return {
    cotacoes,
    isLoading,
    refetch: fetchCotacoes,
    createCotacao,
    updateCotacao,
    addContato,
    aprovarCotacao,
    getMensalidadeByTipo,
  };
}
