import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define module and action types matching the database enums
export type PermissionModule = 
  | 'dashboard'
  | 'leads'
  | 'cotacoes'
  | 'associados'
  | 'veiculos'
  | 'vistorias'
  | 'contratos'
  | 'relatorios'
  | 'financeiro'
  | 'usuarios'
  | 'cotas'
  | 'configuracoes';

export type PermissionAction = 'visualizar' | 'criar' | 'editar' | 'excluir';

export interface UserPermission {
  id: string;
  user_id: string;
  module: PermissionModule;
  action: PermissionAction;
  granted: boolean;
  granted_by: string | null;
  granted_at: string | null;
}

export interface PermissionMatrix {
  [module: string]: {
    [action: string]: boolean;
  };
}

// All available modules with their labels
export const PERMISSION_MODULES: { id: PermissionModule; label: string }[] = [
  { id: 'dashboard', label: 'Painel' },
  { id: 'leads', label: 'Leads' },
  { id: 'cotacoes', label: 'Cotações' },
  { id: 'associados', label: 'Associados' },
  { id: 'veiculos', label: 'Veículos' },
  { id: 'vistorias', label: 'Vistorias' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'cotas', label: 'Cotas' },
  { id: 'configuracoes', label: 'Configurações' },
];

// All available actions with their labels
export const PERMISSION_ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: 'visualizar', label: 'Visualizar' },
  { id: 'criar', label: 'Criar' },
  { id: 'editar', label: 'Editar' },
  { id: 'excluir', label: 'Excluir' },
];

// Default permissions for each base profile
export const DEFAULT_PERMISSIONS: Record<string, PermissionMatrix> = {
  admin_nivel_basico: {
    dashboard: { visualizar: true, criar: true, editar: true, excluir: true },
    leads: { visualizar: true, criar: true, editar: true, excluir: true },
    cotacoes: { visualizar: true, criar: true, editar: true, excluir: true },
    associados: { visualizar: true, criar: true, editar: true, excluir: true },
    veiculos: { visualizar: true, criar: true, editar: true, excluir: true },
    vistorias: { visualizar: true, criar: true, editar: true, excluir: true },
    contratos: { visualizar: true, criar: true, editar: true, excluir: true },
    relatorios: { visualizar: true, criar: true, editar: true, excluir: true },
    financeiro: { visualizar: true, criar: true, editar: true, excluir: true },
    usuarios: { visualizar: true, criar: true, editar: true, excluir: false },
    cotas: { visualizar: true, criar: true, editar: true, excluir: true },
    configuracoes: { visualizar: true, criar: true, editar: true, excluir: false },
  },
  gerente: {
    dashboard: { visualizar: true, criar: false, editar: false, excluir: false },
    leads: { visualizar: true, criar: true, editar: true, excluir: false },
    cotacoes: { visualizar: true, criar: true, editar: true, excluir: false },
    associados: { visualizar: true, criar: true, editar: true, excluir: false },
    veiculos: { visualizar: true, criar: true, editar: true, excluir: false },
    vistorias: { visualizar: true, criar: true, editar: true, excluir: false },
    contratos: { visualizar: true, criar: false, editar: false, excluir: false },
    relatorios: { visualizar: true, criar: false, editar: false, excluir: false },
    financeiro: { visualizar: false, criar: false, editar: false, excluir: false },
    usuarios: { visualizar: false, criar: false, editar: false, excluir: false },
    cotas: { visualizar: true, criar: false, editar: false, excluir: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluir: false },
  },
  consultor_vendas: {
    dashboard: { visualizar: true, criar: false, editar: false, excluir: false },
    leads: { visualizar: true, criar: true, editar: true, excluir: false },
    cotacoes: { visualizar: true, criar: true, editar: true, excluir: false },
    associados: { visualizar: true, criar: true, editar: true, excluir: false },
    veiculos: { visualizar: true, criar: true, editar: true, excluir: false },
    vistorias: { visualizar: false, criar: false, editar: false, excluir: false },
    contratos: { visualizar: true, criar: false, editar: false, excluir: false },
    relatorios: { visualizar: false, criar: false, editar: false, excluir: false },
    financeiro: { visualizar: false, criar: false, editar: false, excluir: false },
    usuarios: { visualizar: false, criar: false, editar: false, excluir: false },
    cotas: { visualizar: true, criar: false, editar: false, excluir: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluir: false },
  },
};

export function useUserPermissions(targetUserId?: string) {
  const { user, isAdminPrincipal } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch permissions for a specific user
  const fetchPermissions = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Cast the data to UserPermission type
      const typedPermissions = (data || []).map(p => ({
        ...p,
        module: p.module as PermissionModule,
        action: p.action as PermissionAction,
      }));

      setPermissions(typedPermissions);

      // Convert to matrix format
      const matrix: PermissionMatrix = {};
      PERMISSION_MODULES.forEach(mod => {
        matrix[mod.id] = {};
        PERMISSION_ACTIONS.forEach(act => {
          const perm = typedPermissions.find(
            p => p.module === mod.id && p.action === act.id
          );
          matrix[mod.id][act.id] = perm?.granted || false;
        });
      });
      setPermissionMatrix(matrix);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if current user has a specific permission
  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      // Admin principal always has all permissions
      if (isAdminPrincipal) return true;
      return permissionMatrix[module]?.[action] || false;
    },
    [isAdminPrincipal, permissionMatrix]
  );

  // Check if current user can access a module (has any permission for it)
  const canAccessModule = useCallback(
    (module: PermissionModule): boolean => {
      if (isAdminPrincipal) return true;
      const modulePerms = permissionMatrix[module];
      if (!modulePerms) return false;
      return Object.values(modulePerms).some(granted => granted);
    },
    [isAdminPrincipal, permissionMatrix]
  );

  // Save permissions for a user (only admin_principal can do this)
  const savePermissions = async (
    userId: string,
    matrix: PermissionMatrix,
    companyId: string
  ): Promise<boolean> => {
    if (!isAdminPrincipal) {
      console.error('Only admin_principal can modify permissions');
      return false;
    }

    try {
      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Prepare new permissions
      const newPermissions: {
        user_id: string;
        module: PermissionModule;
        action: PermissionAction;
        granted: boolean;
        granted_by: string;
        company_id: string;
      }[] = [];

      PERMISSION_MODULES.forEach(mod => {
        PERMISSION_ACTIONS.forEach(act => {
          newPermissions.push({
            user_id: userId,
            module: mod.id,
            action: act.id,
            granted: matrix[mod.id]?.[act.id] || false,
            granted_by: user!.id,
            company_id: companyId,
          });
        });
      });

      // Insert new permissions
      const { error } = await supabase
        .from('user_permissions')
        .insert(newPermissions);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error saving permissions:', error);
      return false;
    }
  };

  // Apply default permissions based on profile type
  const applyDefaultPermissions = (profileType: string): PermissionMatrix => {
    return DEFAULT_PERMISSIONS[profileType] || DEFAULT_PERMISSIONS.consultor_vendas;
  };

  // Load current user's permissions on mount
  useEffect(() => {
    const userId = targetUserId || user?.id;
    if (userId) {
      fetchPermissions(userId);
    }
  }, [targetUserId, user?.id, fetchPermissions]);

  return {
    permissions,
    permissionMatrix,
    isLoading,
    hasPermission,
    canAccessModule,
    savePermissions,
    applyDefaultPermissions,
    fetchPermissions,
    setPermissionMatrix,
  };
}

// Hook for checking permissions at route level
export function useRoutePermission(module: PermissionModule) {
  const { isAdminPrincipal, user } = useAuth();
  const { canAccessModule, isLoading } = useUserPermissions(user?.id);

  return {
    canAccess: isAdminPrincipal || canAccessModule(module),
    isLoading,
  };
}
