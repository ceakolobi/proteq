import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BeneficioExtra {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  valor_mensal: number;
  ordem: number;
  ativo: boolean;
  aplica_carro: boolean;
  aplica_moto: boolean;
  aplica_caminhonete: boolean;
  created_at: string;
  updated_at: string;
}

/** Lista benefícios extras ativos (para uso em cotações) */
export function useBeneficiosExtrasAtivos(tipoBem?: string) {
  return useQuery({
    queryKey: ['beneficios-extras-ativos', tipoBem],
    queryFn: async () => {
      let query = supabase
        .from('beneficios_extras')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // Deduplica por id (proteção contra duplicatas no banco)
      let lista = Array.from(
        new Map(((data ?? []) as BeneficioExtra[]).map(b => [b.id, b])).values()
      );

      // Filtra por tipo de bem
      if (tipoBem === 'carro') lista = lista.filter(b => b.aplica_carro);
      else if (tipoBem === 'moto') lista = lista.filter(b => b.aplica_moto);
      else if (tipoBem === 'caminhonete') lista = lista.filter(b => b.aplica_caminhonete);

      return lista;
    },
  });
}

/** Lista todos os benefícios (incluindo inativos) — para admin */
export function useBeneficiosExtras() {
  return useQuery({
    queryKey: ['beneficios-extras-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficios_extras')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BeneficioExtra[];
    },
  });
}

export function useUpsertBeneficio() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BeneficioExtra> & { nome: string; valor_mensal: number }) => {
      const payload: any = {
        nome: input.nome,
        descricao: input.descricao ?? null,
        icone: input.icone ?? 'Sparkles',
        valor_mensal: input.valor_mensal,
        ordem: input.ordem ?? 0,
        ativo: input.ativo ?? true,
        aplica_carro: input.aplica_carro ?? true,
        aplica_moto: input.aplica_moto ?? true,
        aplica_caminhonete: input.aplica_caminhonete ?? true,
        company_id: profile?.company_id ?? null,
      };

      if (input.id) {
        const { error } = await supabase.from('beneficios_extras').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('beneficios_extras').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficios-extras-all'] });
      qc.invalidateQueries({ queryKey: ['beneficios-extras-ativos'] });
      toast.success('Benefício salvo!');
    },
    onError: (err: any) => toast.error('Erro ao salvar: ' + err.message),
  });
}

export function useDeleteBeneficio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficios_extras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficios-extras-all'] });
      qc.invalidateQueries({ queryKey: ['beneficios-extras-ativos'] });
      toast.success('Benefício removido!');
    },
    onError: (err: any) => toast.error('Erro ao remover: ' + err.message),
  });
}
