import { useAuth } from '@/contexts/AuthContext';
import { createMasker, canViewFinancialData, canViewSensitiveData } from '@/lib/dataMasking';
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
    // System Admin / Admin Principal vê tudo
    fullAccess: isGlobalAdmin,
    // Admin Regional vê tudo da empresa
    companyAccess: roles.includes('admin_regional') || isGlobalAdmin,
    // Cadastro vê dados pessoais
    personalDataAccess: roles.includes('admin_regional') || roles.includes('cadastro') || isGlobalAdmin,
    // Financeiro vê apenas dados financeiros
    financialAccess: canViewFinancialData(roles, isGlobalAdmin),
    // Consultor vê apenas seus dados
    ownDataOnly: roles.includes('consultor_vendas') && !roles.includes('admin_regional') && !isGlobalAdmin,
    // Vistoriador vê apenas vistorias atribuídas
    assignedOnly: roles.includes('vistoriador') && !roles.includes('admin_regional') && !isGlobalAdmin,
  }), [isGlobalAdmin, roles]);
}

/**
 * Hook para verificar se exportação está permitida
 */
export function useCanExport() {
  const { isGlobalAdmin, roles } = useAuth();
  
  return useMemo(() => ({
    // Apenas System Admin / Admin Principal pode exportar dados completos
    canExportFull: isGlobalAdmin,
    // Admin Regional pode exportar dados da empresa (com mascaramento)
    canExportCompany: roles.includes('admin_regional') || isGlobalAdmin,
    // Financeiro pode exportar relatórios financeiros
    canExportFinancial: canViewFinancialData(roles, isGlobalAdmin),
    // Consultor não pode exportar
    canExportAny: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('financeiro'),
  }), [isGlobalAdmin, roles]);
}

/**
 * Hook para verificar permissões de acesso por role
 */
export function useRolePermissions() {
  const { isGlobalAdmin, roles, user } = useAuth();
  
  return useMemo(() => ({
    isSystemAdmin: isGlobalAdmin,
    isAdminEmpresa: roles.includes('admin_regional') || isGlobalAdmin,
    isConsultor: roles.includes('consultor_vendas'),
    isFinanceiro: roles.includes('financeiro'),
    isVistoriador: roles.includes('vistoriador'),
    isCadastro: roles.includes('cadastro'),
    
    // Verificações de acesso a módulos
    canAccessLeads: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('consultor_vendas'),
    canAccessCotacoes: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('consultor_vendas'),
    canAccessVistorias: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('vistoriador') || roles.includes('cadastro'),
    canAccessPagamentos: canViewFinancialData(roles, isGlobalAdmin),
    canAccessAssociados: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('cadastro') || roles.includes('consultor_vendas'),
    canAccessVeiculos: isGlobalAdmin || roles.includes('admin_regional') || roles.includes('cadastro') || roles.includes('vistoriador'),
    canAccessUsuarios: isGlobalAdmin || roles.includes('admin_regional'),
    canAccessConfiguracoes: isGlobalAdmin,
    
    // ID do usuário para filtragem
    userId: user?.id,
  }), [isGlobalAdmin, roles, user]);
}
