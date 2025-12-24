import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para obter IDs de regiões baseado na sede do usuário
 * Centraliza a lógica de filtro Admin Regional para evitar duplicação
 */
export function useSedeRegioes() {
  const { profile, isAdminPrincipal, hasRole } = useAuth();
  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  
  const [regiaoIds, setRegiaoIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRegiaoIds = useCallback(async () => {
    // Só busca se for Admin Regional e tiver sede
    if (!isAdminRegional || !profile?.sede_id) {
      setRegiaoIds([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('regioes')
        .select('id')
        .eq('sede_id', profile.sede_id);
      
      setRegiaoIds(data?.map(r => r.id) || []);
    } catch (error) {
      console.error('Error fetching sede regioes:', error);
      setRegiaoIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdminRegional, profile?.sede_id]);

  useEffect(() => {
    fetchRegiaoIds();
  }, [fetchRegiaoIds]);

  return {
    regiaoIds,
    isLoading,
    isAdminRegional,
    sedeId: profile?.sede_id || null,
    refresh: fetchRegiaoIds,
  };
}

/**
 * Hook para batch fetch de roles de usuários
 * Evita N+1 queries ao buscar roles para múltiplos usuários
 */
export function useUserRolesBatch(userIds: string[]) {
  const [rolesMap, setRolesMap] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userIds.length === 0) {
      setRolesMap(new Map());
      return;
    }

    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Agrupa roles por user_id
        const map = new Map<string, string[]>();
        (data || []).forEach(row => {
          const existing = map.get(row.user_id) || [];
          existing.push(row.role);
          map.set(row.user_id, existing);
        });

        setRolesMap(map);
      } catch (error) {
        console.error('Error batch fetching roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [JSON.stringify(userIds)]);

  const getRoles = useCallback((userId: string) => {
    return rolesMap.get(userId) || [];
  }, [rolesMap]);

  return { rolesMap, getRoles, isLoading };
}

/**
 * Hook para contar associados por sede (via regiões)
 */
export function useSedeAssociadosCounts(sedeIds: string[]) {
  const [countsMap, setCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sedeIds.length === 0) {
      setCounts(new Map());
      return;
    }

    const fetchCounts = async () => {
      setIsLoading(true);
      try {
        // Primeiro busca regiões por sede
        const { data: regioesData } = await supabase
          .from('regioes')
          .select('id, sede_id')
          .in('sede_id', sedeIds);

        if (!regioesData || regioesData.length === 0) {
          setCounts(new Map());
          setIsLoading(false);
          return;
        }

        const regiaoIds = regioesData.map(r => r.id);
        const regiaoToSede = new Map(regioesData.map(r => [r.id, r.sede_id]));

        // Busca associados por região
        const { data: associadosData } = await supabase
          .from('associados')
          .select('regiao_id')
          .in('regiao_id', regiaoIds);

        // Agrupa por sede
        const map = new Map<string, number>();
        (associadosData || []).forEach(a => {
          const sedeId = regiaoToSede.get(a.regiao_id);
          if (sedeId) {
            map.set(sedeId, (map.get(sedeId) || 0) + 1);
          }
        });

        setCounts(map);
      } catch (error) {
        console.error('Error counting associados by sede:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [JSON.stringify(sedeIds)]);

  const getCount = useCallback((sedeId: string) => {
    return countsMap.get(sedeId) || 0;
  }, [countsMap]);

  return { countsMap, getCount, isLoading };
}

/**
 * Hook para contar profiles por sede
 */
export function useSedeProfilesCounts(sedeIds: string[]) {
  const [countsMap, setCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sedeIds.length === 0) {
      setCounts(new Map());
      return;
    }

    const fetchCounts = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('sede_id')
          .in('sede_id', sedeIds);

        const map = new Map<string, number>();
        (data || []).forEach(p => {
          if (p.sede_id) {
            map.set(p.sede_id, (map.get(p.sede_id) || 0) + 1);
          }
        });

        setCounts(map);
      } catch (error) {
        console.error('Error counting profiles by sede:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [JSON.stringify(sedeIds)]);

  const getCount = useCallback((sedeId: string) => {
    return countsMap.get(sedeId) || 0;
  }, [countsMap]);

  return { countsMap, getCount, isLoading };
}
