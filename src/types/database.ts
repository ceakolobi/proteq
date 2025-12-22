export type AppRole = 
  | 'admin_principal'
  | 'admin_regional'
  | 'financeiro'
  | 'cadastro'
  | 'consultor_vendas'
  | 'vistoriador'
  | 'associado';

export type VehicleType = 'carro' | 'moto' | 'pickup';

export type ProposalStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'cancelada';

export type InspectionStatus = 'pendente' | 'em_andamento' | 'aprovada' | 'reprovada';

export type AssociateStatus = 'ativo' | 'inadimplente' | 'suspenso' | 'cancelado';

export interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cpf?: string;
  sede_id?: string;
  regiao_id?: string;
  ativo: boolean;
  is_admin_principal: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Sede {
  id: string;
  nome: string;
  tipo: 'matriz' | 'regional';
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Regiao {
  id: string;
  nome: string;
  sede_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  sede?: Sede;
}

export interface Cota {
  id: string;
  nome: string;
  fipe_min: number;
  fipe_max: number;
  mensalidade_carro: number;
  mensalidade_moto: number;
  mensalidade_pickup: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  consultor_id: string;
  regiao_id?: string;
  observacoes?: string;
  convertido: boolean;
  created_at: string;
  updated_at: string;
}

export interface Associado {
  id: string;
  user_id?: string;
  nome_completo: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  telefone: string;
  email: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  consultor_id?: string;
  regiao_id?: string;
  status: AssociateStatus;
  termos_aceitos: boolean;
  termos_aceitos_em?: string;
  created_at: string;
  updated_at: string;
}

export interface Veiculo {
  id: string;
  associado_id: string;
  tipo: VehicleType;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  cor?: string;
  chassi?: string;
  renavam?: string;
  valor_fipe: number;
  cota_id?: string;
  mensalidade: number;
  carro_reserva_dias: number;
  carro_reserva_adicional: number;
  protecao_ativa: boolean;
  protecao_ativada_em?: string;
  created_at: string;
  updated_at: string;
  cota?: Cota;
}

export interface Proposta {
  id: string;
  lead_id?: string;
  associado_id?: string;
  consultor_id: string;
  veiculo_marca: string;
  veiculo_modelo: string;
  veiculo_ano: number;
  veiculo_tipo: VehicleType;
  valor_fipe: number;
  cota_id?: string;
  mensalidade: number;
  participacao: number;
  carro_reserva_dias: number;
  carro_reserva_adicional: number;
  status: ProposalStatus;
  aceita_em?: string;
  created_at: string;
  updated_at: string;
}

export interface Vistoria {
  id: string;
  veiculo_id: string;
  vistoriador_id?: string;
  proposta_id?: string;
  status: InspectionStatus;
  data_agendada?: string;
  data_realizada?: string;
  observacoes?: string;
  checklist?: Record<string, boolean>;
  fotos?: string[];
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
  id: string;
  associado_id: string;
  veiculo_id?: string;
  valor: number;
  tipo: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  referencia?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  acao: string;
  tabela: string;
  registro_id?: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface AcionamentoGuincho {
  id: string;
  veiculo_id: string;
  associado_id: string;
  data_acionamento: string;
  km_utilizado: number;
  origem?: string;
  destino?: string;
  observacoes?: string;
  created_at: string;
}

// Role labels for display
export const roleLabels: Record<AppRole, string> = {
  admin_principal: 'Admin Principal',
  admin_regional: 'Admin Regional',
  financeiro: 'Financeiro',
  cadastro: 'Cadastro',
  consultor_vendas: 'Consultor de Vendas',
  vistoriador: 'Vistoriador',
  associado: 'Associado'
};

// Status labels
export const associateStatusLabels: Record<AssociateStatus, string> = {
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado'
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada'
};

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada'
};

export const vehicleTypeLabels: Record<VehicleType, string> = {
  carro: 'Carro',
  moto: 'Motocicleta',
  pickup: 'Pickup/Camionete'
};
