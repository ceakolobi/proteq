import { useAuth } from '@/contexts/AuthContext';
import { createMasker } from '@/lib/dataMasking';
import { useMemo } from 'react';

/**
 * Hook para obter funções de mascaramento configuradas para o usuário atual
 */
export function useDataMasking() {
  const { roles, isGlobalAdmin } = useAuth();
  
  const masker = useMemo(() => {
    return createMasker(roles, isGlobalAdmin);
  }, [roles, isGlobalAdmin]);
  
  return masker;
}

/**
 * Hook para verificar se o usuário pode ver dados completos
 */
export function useCanViewFullData() {
  const { isGlobalAdmin, roles } = useAuth();
  
  return useMemo(() => ({
    // Admin Principal vê tudo
    fullAccess: isGlobalAdmin,
    // Admin Regional e Cadastro veem dados parciais
    partialAccess: roles.includes('admin_regional') || roles.includes('cadastro'),
    // Financeiro vê apenas dados financeiros
    financialOnly: roles.includes('financeiro') && !roles.includes('admin_regional'),
    // Consultor vê apenas seus dados
    ownDataOnly: roles.includes('consultor_vendas') && !roles.includes('admin_regional'),
  }), [isGlobalAdmin, roles]);
}

/**
 * Hook para verificar se exportação está permitida
 */
export function useCanExport() {
  const { isGlobalAdmin, roles } = useAuth();
  
  return useMemo(() => ({
    // Apenas Admin Principal pode exportar dados completos
    canExportFull: isGlobalAdmin,
    // Admin Regional pode exportar dados da sua região (mascarados)
    canExportRegional: roles.includes('admin_regional') || isGlobalAdmin,
    // Financeiro pode exportar relatórios financeiros
    canExportFinancial: roles.includes('financeiro') || isGlobalAdmin,
    // Consultor não pode exportar
    canExportAny: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('financeiro'),
  }), [isGlobalAdmin, roles]);
}
