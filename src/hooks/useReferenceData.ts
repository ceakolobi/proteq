import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Regiao, Sede, Cota, Profile } from '@/types/database';

interface ReferenceDataOptions {
  loadRegioes?: boolean;
  loadSedes?: boolean;
  loadCotas?: boolean;
  loadConsultores?: boolean;
  filterByUserAccess?: boolean;
}

interface ReferenceDataResult {
  regioes: Regiao[];
  sedes: Sede[];
  cotas: Cota[];
  consultores: Profile[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getRegiaoNome: (id: string | null) => string;
  getSedeNome: (id: string | null) => string;
  getCotaNome: (id: string | null) => string;
  getConsultorNome: (id: string | null) => string;
}

/**
 * Hook unificado para carregar dados de referência comuns
 * Evita queries duplicadas e centraliza o carregamento
 */
export function useReferenceData(options: ReferenceDataOptions = {}): ReferenceDataResult {
  const {
    loadRegioes = true,
    loadSedes = false,
    loadCotas = false,
    loadConsultores = false,
    filterByUserAccess = true,
  } = options;

  const { profile, isAdminPrincipal, hasRole } = useAuth();
  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;

  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [consultores, setConsultores] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRegioes = useCallback(async () => {
    try {
      let query = supabase.from('regioes').select('*').eq('ativo', true).order('nome');

      // Admin Regional: filtrar por sede
      if (filterByUserAccess && isAdminRegional && profile?.sede_id) {
        query = query.eq('sede_id', profile.sede_id);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setRegioes(data || []);
    } catch (err) {
      console.error('Error fetching regioes:', err);
      throw err;
    }
  }, [filterByUserAccess, isAdminRegional, profile?.sede_id]);

  const fetchSedes = useCallback(async () => {
    try {
      let query = supabase.from('sedes').select('*').eq('ativo', true).order('nome');

      // Admin Regional: filtrar por própria sede
      if (filterByUserAccess && isAdminRegional && profile?.sede_id) {
        query = query.eq('id', profile.sede_id);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setSedes((data || []).map(s => ({ ...s, tipo: s.tipo as 'matriz' | 'regional' })));
    } catch (err) {
      console.error('Error fetching sedes:', err);
      throw err;
    }
  }, [filterByUserAccess, isAdminRegional, profile?.sede_id]);

  const fetchCotas = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('cotas')
        .select('*')
        .order('fipe_min');

      if (err) throw err;
      setCotas((data || []).map(c => ({
        ...c,
        fipe_min: Number(c.fipe_min),
        fipe_max: Number(c.fipe_max),
        valor_carro: Number(c.valor_carro),
        valor_moto: Number(c.valor_moto),
        valor_camionete: Number(c.valor_camionete),
        percentual_geral: Number(c.percentual_geral) || 0,
        percentual_extra: Number(c.percentual_extra) || 0,
      })));
    } catch (err) {
      console.error('Error fetching cotas:', err);
      throw err;
    }
  }, []);

  const fetchConsultores = useCallback(async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setConsultores([]);
        return;
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .in('id', rolesData.map(r => r.user_id))
        .order('nome_completo');

      // Admin Regional: filtrar por sede
      if (filterByUserAccess && isAdminRegional && profile?.sede_id) {
        query = query.eq('sede_id', profile.sede_id);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setConsultores(data || []);
    } catch (err) {
      console.error('Error fetching consultores:', err);
      throw err;
    }
  }, [filterByUserAccess, isAdminRegional, profile?.sede_id]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promises: Promise<void>[] = [];
      if (loadRegioes) promises.push(fetchRegioes());
      if (loadSedes) promises.push(fetchSedes());
      if (loadCotas) promises.push(fetchCotas());
      if (loadConsultores) promises.push(fetchConsultores());
      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar dados'));
    } finally {
      setIsLoading(false);
    }
  }, [loadRegioes, loadSedes, loadCotas, loadConsultores, fetchRegioes, fetchSedes, fetchCotas, fetchConsultores]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Memoized lookup functions
  const regioesMap = useMemo(() => new Map(regioes.map(r => [r.id, r.nome])), [regioes]);
  const sedesMap = useMemo(() => new Map(sedes.map(s => [s.id, s.nome])), [sedes]);
  const cotasMap = useMemo(() => new Map(cotas.map(c => [c.id, c.cota_nome])), [cotas]);
  const consultoresMap = useMemo(() => new Map(consultores.map(c => [c.id, c.nome_completo])), [consultores]);

  const getRegiaoNome = useCallback((id: string | null) => id ? regioesMap.get(id) || '' : '', [regioesMap]);
  const getSedeNome = useCallback((id: string | null) => id ? sedesMap.get(id) || '' : '', [sedesMap]);
  const getCotaNome = useCallback((id: string | null) => id ? cotasMap.get(id) || '' : '', [cotasMap]);
  const getConsultorNome = useCallback((id: string | null) => id ? consultoresMap.get(id) || '' : '', [consultoresMap]);

  return {
    regioes,
    sedes,
    cotas,
    consultores,
    isLoading,
    error,
    refresh,
    getRegiaoNome,
    getSedeNome,
    getCotaNome,
    getConsultorNome,
  };
}

// Cache de regiões por ID para lookup rápido
export function useRegiaoLookup(regiaoIds: (string | null)[]) {
  const [regioesMap, setRegioesMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const uniqueIds = [...new Set(regiaoIds.filter((id): id is string => id !== null))];
    if (uniqueIds.length === 0) return;

    const fetchRegioes = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('regioes')
          .select('id, nome')
          .in('id', uniqueIds);
        
        if (data) {
          setRegioesMap(new Map(data.map(r => [r.id, r.nome])));
        }
      } catch (error) {
        console.error('Error fetching regioes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegioes();
  }, [JSON.stringify(regiaoIds)]);

  return { regioesMap, isLoading, getNome: (id: string | null) => id ? regioesMap.get(id) || '' : '' };
}
