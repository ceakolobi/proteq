import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ResourceType = 
  | 'associado' 
  | 'veiculo' 
  | 'lead' 
  | 'proposta' 
  | 'pagamento' 
  | 'vistoria' 
  | 'profile'
  | 'relatorio'
  | 'cotacao';

type ActionType = 
  | 'view' 
  | 'view_list' 
  | 'view_detail' 
  | 'export' 
  | 'create' 
  | 'update' 
  | 'delete';

interface LogDetails {
  count?: number;
  filters?: Record<string, unknown>;
  exportFormat?: 'csv' | 'pdf';
  fields?: string[];
}

/**
 * Hook para registrar acessos a dados sensíveis
 */
export function useAccessLogger() {
  const { user } = useAuth();

  const logAccess = useCallback(async (
    action: ActionType,
    resourceType: ResourceType,
    resourceId?: string,
    details?: LogDetails
  ) => {
    if (!user) return;

    try {
      // Usa a função RPC para logging
      await supabase.rpc('log_sensitive_access', {
        _action: action,
        _resource_type: resourceType,
        _resource_id: resourceId || null,
        _details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      // Silently fail - não deve impedir operação do usuário
      console.warn('Failed to log access:', error);
    }
  }, [user]);

  const logViewList = useCallback((
    resourceType: ResourceType, 
    count: number, 
    filters?: Record<string, unknown>
  ) => {
    return logAccess('view_list', resourceType, undefined, { count, filters });
  }, [logAccess]);

  const logViewDetail = useCallback((
    resourceType: ResourceType, 
    resourceId: string
  ) => {
    return logAccess('view_detail', resourceType, resourceId);
  }, [logAccess]);

  const logExport = useCallback((
    resourceType: ResourceType, 
    count: number, 
    format: 'csv' | 'pdf',
    filters?: Record<string, unknown>
  ) => {
    return logAccess('export', resourceType, undefined, { count, exportFormat: format, filters });
  }, [logAccess]);

  const logCreate = useCallback((
    resourceType: ResourceType, 
    resourceId: string
  ) => {
    return logAccess('create', resourceType, resourceId);
  }, [logAccess]);

  const logUpdate = useCallback((
    resourceType: ResourceType, 
    resourceId: string,
    fields?: string[]
  ) => {
    return logAccess('update', resourceType, resourceId, { fields });
  }, [logAccess]);

  const logDelete = useCallback((
    resourceType: ResourceType, 
    resourceId: string
  ) => {
    return logAccess('delete', resourceType, resourceId);
  }, [logAccess]);

  return {
    logAccess,
    logViewList,
    logViewDetail,
    logExport,
    logCreate,
    logUpdate,
    logDelete,
  };
}
