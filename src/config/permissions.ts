/**
 * Configuração Centralizada de Permissões RBAC
 * 
 * Roles simplificadas:
 * - admin_principal: Acesso total, imutável (não pode ser excluído ou perder permissões)
 * - admin_nivel_basico: Acesso completo, exceto alterar admin_principal
 * - gerente: Acesso operacional/gerencial da unidade (sem config global, cotas ou usuários admin)
 * - consultor_vendas: Acesso apenas ao próprio funil
 */

import type { AppRole } from '@/types/database';

// Roles principais do sistema (4 roles conforme especificado)
export const MAIN_ROLES: AppRole[] = [
  'admin_principal',
  'admin_nivel_basico',
  'gerente',
  'consultor_vendas',
];

// Roles legadas mantidas para compatibilidade
export const LEGACY_ROLES: AppRole[] = [
  'admin_regional',
  'financeiro',
  'cadastro',
  'vistoriador',
  'recepcao',
  'operacional',
];

// Roles disponíveis para atribuição (admin_principal é protegido)
export const ASSIGNABLE_ROLES: AppRole[] = [
  'admin_nivel_basico',
  'gerente',
  'consultor_vendas',
  'admin_demo', // Demo user - read-only
  // Legadas
  'admin_regional',
  'financeiro',
  'cadastro',
  'vistoriador',
];

// Labels para exibição
export const ROLE_LABELS: Record<string, string> = {
  admin_principal: 'Admin Principal',
  admin_nivel_basico: 'Admin Básico',
  gerente: 'Gerente Regional',
  consultor_vendas: 'Consultor',
  admin_demo: 'Admin Demo (Somente Leitura)',
  // Legadas
  admin_regional: 'Admin Sede',
  financeiro: 'Financeiro',
  cadastro: 'Cadastro',
  vistoriador: 'Vistoriador',
  recepcao: 'Recepção',
  operacional: 'Operacional',
};

// Definição de permissões por rota
export interface RoutePermission {
  path: string;
  allowedRoles: AppRole[];
  label: string;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Dashboard - todos têm acesso
  { path: '/dashboard', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Painel' },
  
  // Comercial
  { path: '/leads', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Leads' },
  { path: '/cotacoes', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Cotações' },
  { path: '/cotacao', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Simulador' },
  
  // Gestão - gerente tem acesso limitado
  { path: '/regional', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente'], label: 'Painel Regional' },
  { path: '/consultor', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Painel Consultor' },
  { path: '/consultores', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente'], label: 'Consultores' },
  { path: '/sedes', allowedRoles: ['admin_principal', 'admin_nivel_basico'], label: 'Sedes' },
  
  // Cadastro
  { path: '/associados', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Associados' },
  { path: '/veiculos', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Veículos' },
  { path: '/ativacoes', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente', 'consultor_vendas'], label: 'Ativações' },
  { path: '/vistorias', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente'], label: 'Vistorias' },
  { path: '/relatorios', allowedRoles: ['admin_principal', 'admin_nivel_basico', 'gerente'], label: 'Relatórios' },
  
  // Usuários - apenas admins
  { path: '/usuarios', allowedRoles: ['admin_principal', 'admin_nivel_basico'], label: 'Usuários' },
  
  // Finanças
  { path: '/financeiro', allowedRoles: ['admin_principal', 'admin_nivel_basico'], label: 'Financeiro' },
  { path: '/cotas', allowedRoles: ['admin_principal', 'admin_nivel_basico'], label: 'Cotas' },
  
  // Administração - apenas admin_principal
  { path: '/admin', allowedRoles: ['admin_principal', 'admin_nivel_basico'], label: 'Painel Admin' },
  { path: '/configuracoes', allowedRoles: ['admin_principal'], label: 'Configurações' },
];

// Função para verificar se uma role tem acesso a uma rota
export function hasRouteAccess(roles: AppRole[], path: string, isAdminPrincipal: boolean): boolean {
  // Admin Principal sempre tem acesso total
  if (isAdminPrincipal) return true;
  
  const routePermission = ROUTE_PERMISSIONS.find(r => r.path === path);
  if (!routePermission) return true; // Se não está definido, permite acesso
  
  return routePermission.allowedRoles.some(allowedRole => roles.includes(allowedRole));
}

// Função para obter as rotas permitidas para uma role
export function getAllowedRoutes(roles: AppRole[], isAdminPrincipal: boolean): string[] {
  if (isAdminPrincipal) {
    return ROUTE_PERMISSIONS.map(r => r.path);
  }
  
  return ROUTE_PERMISSIONS
    .filter(route => route.allowedRoles.some(allowedRole => roles.includes(allowedRole)))
    .map(r => r.path);
}

// Verificar se pode gerenciar um usuário específico
export function canManageUser(
  currentUserRoles: AppRole[],
  currentUserIsAdminPrincipal: boolean,
  targetUserIsAdminPrincipal: boolean,
  targetUserEmail?: string
): boolean {
  // Ninguém pode gerenciar o admin principal
  if (targetUserIsAdminPrincipal || targetUserEmail === 'admin@system.com') {
    return false;
  }
  
  // Admin Principal pode gerenciar todos os outros
  if (currentUserIsAdminPrincipal) return true;
  
  // Admin Básico pode gerenciar usuários não-admin
  if (currentUserRoles.includes('admin_nivel_basico')) return true;
  
  return false;
}

// Verificar se pode editar credenciais de um usuário
export function canEditCredentials(
  currentUserRoles: AppRole[],
  currentUserIsAdminPrincipal: boolean,
  targetUserIsAdminPrincipal: boolean,
  targetUserEmail?: string
): boolean {
  // Ninguém pode editar credenciais do admin principal
  if (targetUserIsAdminPrincipal || targetUserEmail === 'admin@system.com') {
    return false;
  }
  
  // Apenas Admin Principal e Admin Básico podem editar credenciais
  return currentUserIsAdminPrincipal || currentUserRoles.includes('admin_nivel_basico');
}

// Verificar se pode acessar configurações globais
export function canAccessGlobalSettings(roles: AppRole[], isAdminPrincipal: boolean): boolean {
  return isAdminPrincipal; // Apenas admin_principal
}

// Verificar se pode gerenciar cotas
export function canManageCotas(roles: AppRole[], isAdminPrincipal: boolean): boolean {
  return isAdminPrincipal || roles.includes('admin_nivel_basico');
}

// Ações permitidas por contexto
export interface ActionPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

export function getAssociadoPermissions(roles: AppRole[], isAdminPrincipal: boolean): ActionPermissions {
  if (isAdminPrincipal || roles.includes('admin_nivel_basico')) {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true };
  }
  
  if (roles.includes('gerente')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  if (roles.includes('consultor_vendas')) {
    // Consultor só vê/edita os próprios associados
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  return { canCreate: false, canEdit: false, canDelete: false, canView: false };
}

export function getVeiculoPermissions(roles: AppRole[], isAdminPrincipal: boolean): ActionPermissions {
  if (isAdminPrincipal || roles.includes('admin_nivel_basico')) {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true };
  }
  
  if (roles.includes('gerente')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  if (roles.includes('consultor_vendas')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  return { canCreate: false, canEdit: false, canDelete: false, canView: false };
}

export function getCotacaoPermissions(roles: AppRole[], isAdminPrincipal: boolean): ActionPermissions {
  if (isAdminPrincipal || roles.includes('admin_nivel_basico')) {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true };
  }
  
  if (roles.includes('gerente')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  if (roles.includes('consultor_vendas')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  return { canCreate: false, canEdit: false, canDelete: false, canView: false };
}

export function getLeadPermissions(roles: AppRole[], isAdminPrincipal: boolean): ActionPermissions {
  if (isAdminPrincipal || roles.includes('admin_nivel_basico')) {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true };
  }
  
  if (roles.includes('gerente')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  if (roles.includes('consultor_vendas')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  return { canCreate: false, canEdit: false, canDelete: false, canView: false };
}

export function getUsuarioPermissions(roles: AppRole[], isAdminPrincipal: boolean): ActionPermissions {
  if (isAdminPrincipal) {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true };
  }
  
  if (roles.includes('admin_nivel_basico')) {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }
  
  return { canCreate: false, canEdit: false, canDelete: false, canView: false };
}
