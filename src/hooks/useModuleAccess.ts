import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions, PermissionModule, PermissionAction } from './useUserPermissions';

/**
 * Hook para controle de acesso por módulo.
 * 
 * REGRA PRINCIPAL: Permissões granulares (user_permissions) têm prioridade absoluta.
 * O perfil (role) serve apenas como fallback quando não há permissões cadastradas.
 * 
 * Fluxo de decisão:
 * 1. Admin Principal → acesso total
 * 2. Usuário com permissões granulares → respeita user_permissions
 * 3. Usuário sem permissões granulares → fallback por role (legado)
 */
export function useModuleAccess(module: PermissionModule) {
  const { user, isAdminPrincipal, hasAnyRole } = useAuth();
  const {
    permissions: permissionRows,
    permissionMatrix,
    isLoading,
  } = useUserPermissions(user?.id);

  // Verifica se o usuário tem permissões granulares cadastradas
  // Precisa verificar se existem permissões E se alguma está com granted: true
  const hasGranularPermissions = useMemo(() => {
    const hasPerms = permissionRows.length > 0 && permissionRows.some(p => p.granted);
    return hasPerms;
  }, [permissionRows]);

  // Mapeamento de módulos para roles que teriam acesso por padrão (fallback legado)
  const moduleRoleFallback: Record<PermissionModule, string[]> = useMemo(() => ({
    dashboard: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'financeiro', 'cadastro', 'vistoriador'],
    leads: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
    cotacoes: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
    associados: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro'],
    veiculos: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro', 'vistoriador'],
    vistorias: ['admin_nivel_basico', 'admin_regional', 'gerente', 'vistoriador'],
    contratos: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro', 'financeiro'],
    relatorios: ['admin_nivel_basico', 'admin_regional', 'gerente', 'financeiro'],
    financeiro: ['admin_nivel_basico', 'admin_regional', 'financeiro'],
    usuarios: ['admin_nivel_basico'],
    cotas: ['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
    configuracoes: ['admin_nivel_basico'],
  }), []);

  // Verifica acesso por role (fallback legado)
  const roleCanAccess = useCallback(
    (action: PermissionAction = 'visualizar'): boolean => {
      const allowedRoles = moduleRoleFallback[module] || [];
      return hasAnyRole(allowedRoles as any);
    },
    [module, hasAnyRole, moduleRoleFallback]
  );

  // Função principal de verificação de permissão
  const checkPermission = useCallback(
    (action: PermissionAction): boolean => {
      // Admin Principal sempre tem acesso total
      if (isAdminPrincipal) return true;

      // Se tem permissões granulares carregadas, usa elas (prioridade absoluta)
      // Isso verifica primeiro porque as permissões podem já estar no cache
      if (hasGranularPermissions) {
        return permissionMatrix[module]?.[action] === true;
      }

      // Se ainda está carregando e não tem granulares ainda, usa fallback por role
      // Após carregar, se não tem granulares, também usa fallback por role
      return roleCanAccess(action);
    },
    [isAdminPrincipal, hasGranularPermissions, permissionMatrix, module, roleCanAccess]
  );

  return {
    // Permissões individuais
    canView: checkPermission('visualizar'),
    canCreate: checkPermission('criar'),
    canEdit: checkPermission('editar'),
    canDelete: checkPermission('excluir'),
    
    // Acesso à página (equivalente a canView)
    canAccessPage: checkPermission('visualizar'),
    
    // Estado de carregamento
    isLoading,
    
    // Indica se está usando permissões granulares ou fallback
    hasGranularPermissions,
    
    // Função para verificar permissão específica
    checkPermission,
  };
}

/**
 * Hook simplificado para verificar apenas acesso à página
 */
export function usePageAccess(module: PermissionModule) {
  const { canAccessPage, isLoading } = useModuleAccess(module);
  return { canAccessPage, isLoading };
}
