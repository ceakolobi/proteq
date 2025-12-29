import { AppRole } from '@/types/database';

/**
 * Utilitários de mascaramento de dados sensíveis
 * Aplica máscaras baseadas no papel do usuário
 * 
 * Hierarquia RBAC:
 * - System Admin (admin@system.com ou admin_principal): vê TUDO
 * - Admin Empresa (admin_regional): vê tudo da empresa
 * - Cadastro: vê dados para cadastro
 * - Financeiro: só vê dados financeiros
 * - Consultor: só vê leads/cotações criados por ele
 * - Vistoriador: só vê vistorias atribuídas
 */

export type MaskLevel = 'full' | 'partial' | 'none';

export type SensitiveDataType = 
  | 'cpf' 
  | 'rg' 
  | 'telefone' 
  | 'email' 
  | 'endereco' 
  | 'placa' 
  | 'chassi' 
  | 'renavam'
  | 'pagamento'; // Novo tipo para dados financeiros

/**
 * Determina o nível de mascaramento baseado nas roles do usuário
 */
export function getMaskLevel(
  roles: AppRole[],
  isGlobalAdmin: boolean,
  dataType: SensitiveDataType
): MaskLevel {
  // System Admin / Admin Principal tem acesso total
  if (isGlobalAdmin) return 'none';
  
  // Admin Regional (Admin Empresa) vê tudo da empresa
  if (roles.includes('admin_regional')) {
    return 'none';
  }
  
  // Cadastro vê dados pessoais para cadastro
  if (roles.includes('cadastro')) {
    if (dataType === 'pagamento') return 'full'; // Não vê pagamentos
    return 'partial';
  }
  
  // Financeiro vê apenas dados financeiros e contato
  if (roles.includes('financeiro')) {
    if (dataType === 'pagamento') return 'none';
    if (['telefone', 'email'].includes(dataType)) return 'partial';
    return 'full'; // CPF, RG, endereço, placa, chassi, renavam mascarados
  }
  
  // Consultor vê apenas dados de contato (para seus próprios leads/cotações)
  if (roles.includes('consultor_vendas')) {
    if (['telefone', 'email'].includes(dataType)) return 'partial';
    return 'full'; // Tudo mais mascarado
  }
  
  // Vistoriador vê apenas placa parcialmente (para identificar veículo)
  if (roles.includes('vistoriador')) {
    if (dataType === 'placa') return 'partial';
    return 'full'; // Tudo mais mascarado
  }
  
  // Associado pode ver seus próprios dados (tratado no componente)
  if (roles.includes('associado')) {
    return 'none'; // Quando for o próprio dado
  }
  
  // Padrão: mascarar tudo (usuário sem role específica)
  return 'full';
}

/**
 * Verifica se o usuário pode ver dados financeiros
 */
export function canViewFinancialData(roles: AppRole[], isGlobalAdmin: boolean): boolean {
  if (isGlobalAdmin) return true;
  return roles.includes('admin_regional') || roles.includes('financeiro');
}

/**
 * Verifica se o usuário pode ver dados sensíveis completos
 */
export function canViewSensitiveData(roles: AppRole[], isGlobalAdmin: boolean): boolean {
  if (isGlobalAdmin) return true;
  return roles.includes('admin_regional') || roles.includes('cadastro');
}

/**
 * Mascara CPF: 123.456.789-00 → ***.456.***-**
 */
export function maskCPF(cpf: string | null | undefined, level: MaskLevel): string {
  if (!cpf) return '-';
  if (level === 'none') return cpf;
  
  // Remove formatação
  const clean = cpf.replace(/\D/g, '');
  
  if (level === 'full') {
    return '***.***.***-**';
  }
  
  // Parcial: mostra apenas os 3 dígitos do meio
  if (clean.length === 11) {
    return `***.${clean.substring(3, 6)}.***-**`;
  }
  
  return '***.***.***-**';
}

/**
 * Mascara RG: 12.345.678-9 → **.***.**8-*
 */
export function maskRG(rg: string | null | undefined, level: MaskLevel): string {
  if (!rg) return '-';
  if (level === 'none') return rg;
  
  if (level === 'full') {
    return '**.***.***-*';
  }
  
  // Parcial: mostra apenas últimos 2 dígitos
  const clean = rg.replace(/\D/g, '');
  if (clean.length >= 2) {
    return `**.***.***-${clean.slice(-2)}`;
  }
  
  return '**.***.***-*';
}

/**
 * Mascara telefone: (11) 98765-4321 → (11) *****-4321
 */
export function maskTelefone(telefone: string | null | undefined, level: MaskLevel): string {
  if (!telefone) return '-';
  if (level === 'none') return telefone;
  
  const clean = telefone.replace(/\D/g, '');
  
  if (level === 'full') {
    return '(**) *****-****';
  }
  
  // Parcial: mostra DDD e últimos 4 dígitos
  if (clean.length >= 10) {
    const ddd = clean.substring(0, 2);
    const lastFour = clean.slice(-4);
    return `(${ddd}) *****-${lastFour}`;
  }
  
  return '(**) *****-****';
}

/**
 * Mascara email: usuario@email.com → u***o@email.com
 */
export function maskEmail(email: string | null | undefined, level: MaskLevel): string {
  if (!email) return '-';
  if (level === 'none') return email;
  
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***.***';
  
  if (level === 'full') {
    return `***@${domain}`;
  }
  
  // Parcial: mostra primeira e última letra do nome
  if (localPart.length > 2) {
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  }
  
  return `***@${domain}`;
}

/**
 * Mascara endereço: Rua ABC, 123 → Rua ***, ***
 */
export function maskEndereco(endereco: string | null | undefined, level: MaskLevel): string {
  if (!endereco) return '-';
  if (level === 'none') return endereco;
  
  if (level === 'full') {
    return '[Endereço protegido]';
  }
  
  // Parcial: mostra apenas tipo de logradouro
  const parts = endereco.split(' ');
  if (parts.length > 0) {
    return `${parts[0]} ***, ***`;
  }
  
  return '[Endereço protegido]';
}

/**
 * Mascara placa: ABC-1234 → ***-1234
 */
export function maskPlaca(placa: string | null | undefined, level: MaskLevel): string {
  if (!placa) return '-';
  if (level === 'none') return placa;
  
  const clean = placa.replace(/\W/g, '').toUpperCase();
  
  if (level === 'full') {
    return '***-****';
  }
  
  // Parcial: mostra apenas números (últimos 4 caracteres)
  if (clean.length >= 4) {
    return `***-${clean.slice(-4)}`;
  }
  
  return '***-****';
}

/**
 * Mascara chassi: 9BWZZZ377VT004251 → *************4251
 */
export function maskChassi(chassi: string | null | undefined, level: MaskLevel): string {
  if (!chassi) return '-';
  if (level === 'none') return chassi;
  
  if (level === 'full') {
    return '*****************';
  }
  
  // Parcial: mostra apenas últimos 4 caracteres
  if (chassi.length >= 4) {
    return `${'*'.repeat(chassi.length - 4)}${chassi.slice(-4)}`;
  }
  
  return '*****************';
}

/**
 * Mascara RENAVAM: 12345678901 → *******8901
 */
export function maskRenavam(renavam: string | null | undefined, level: MaskLevel): string {
  if (!renavam) return '-';
  if (level === 'none') return renavam;
  
  if (level === 'full') {
    return '***********';
  }
  
  // Parcial: mostra apenas últimos 4 dígitos
  if (renavam.length >= 4) {
    return `${'*'.repeat(renavam.length - 4)}${renavam.slice(-4)}`;
  }
  
  return '***********';
}

/**
 * Mascara valor monetário: R$ 1.234,56 → R$ *.***,**
 */
export function maskPagamento(valor: number | null | undefined, level: MaskLevel): string {
  if (valor === null || valor === undefined) return '-';
  if (level === 'none') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }
  if (level === 'full') {
    return 'R$ *.***,**';
  }
  // Parcial: mostra apenas faixa
  if (valor < 100) return 'R$ 0-100';
  if (valor < 500) return 'R$ 100-500';
  if (valor < 1000) return 'R$ 500-1.000';
  if (valor < 5000) return 'R$ 1.000-5.000';
  return 'R$ 5.000+';
}

/**
 * Hook helper para obter todas as funções de mascaramento configuradas
 */
export function createMasker(roles: AppRole[], isGlobalAdmin: boolean) {
  return {
    cpf: (value: string | null | undefined) => 
      maskCPF(value, getMaskLevel(roles, isGlobalAdmin, 'cpf')),
    rg: (value: string | null | undefined) => 
      maskRG(value, getMaskLevel(roles, isGlobalAdmin, 'rg')),
    telefone: (value: string | null | undefined) => 
      maskTelefone(value, getMaskLevel(roles, isGlobalAdmin, 'telefone')),
    email: (value: string | null | undefined) => 
      maskEmail(value, getMaskLevel(roles, isGlobalAdmin, 'email')),
    endereco: (value: string | null | undefined) => 
      maskEndereco(value, getMaskLevel(roles, isGlobalAdmin, 'endereco')),
    placa: (value: string | null | undefined) => 
      maskPlaca(value, getMaskLevel(roles, isGlobalAdmin, 'placa')),
    chassi: (value: string | null | undefined) => 
      maskChassi(value, getMaskLevel(roles, isGlobalAdmin, 'chassi')),
    renavam: (value: string | null | undefined) => 
      maskRenavam(value, getMaskLevel(roles, isGlobalAdmin, 'renavam')),
    pagamento: (valor: number | null | undefined) =>
      maskPagamento(valor, getMaskLevel(roles, isGlobalAdmin, 'pagamento')),
    // Helpers de verificação
    canViewFinancial: () => canViewFinancialData(roles, isGlobalAdmin),
    canViewSensitive: () => canViewSensitiveData(roles, isGlobalAdmin),
  };
}
