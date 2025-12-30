// Tipos do módulo financeiro

export type MensalidadeStatus = 'pendente' | 'paga' | 'atrasada' | 'cancelada' | 'suspensa';
export type CobrancaTipo = 'boleto' | 'pix' | 'link' | 'manual';
export type CobrancaStatus = 'gerada' | 'enviada' | 'paga' | 'cancelada' | 'vencida';

export interface Mensalidade {
  id: string;
  associado_id: string;
  veiculo_id: string;
  cota_id: string | null;
  company_id: string | null;
  created_by: string | null;
  valor_base: number;
  valor_final: number;
  desconto: number;
  acrescimo: number;
  mes_referencia: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: MensalidadeStatus;
  forma_pagamento: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MensalidadeWithDetails extends Mensalidade {
  associado_nome?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  regiao_nome?: string;
  sede_nome?: string;
  dias_atraso?: number;
}

export interface Cobranca {
  id: string;
  mensalidade_id: string | null;
  associado_id: string;
  company_id: string | null;
  created_by: string | null;
  valor: number;
  tipo: CobrancaTipo;
  link_pagamento: string | null;
  codigo_barras: string | null;
  codigo_pix: string | null;
  status: CobrancaStatus;
  data_vencimento: string;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracoesFinanceiras {
  id: string;
  company_id: string;
  dia_vencimento_padrao: number;
  dias_tolerancia: number;
  percentual_multa: number;
  percentual_juros_dia: number;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  enviar_lembrete_dias_antes: number;
  enviar_cobranca_apos_dias: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceiroDashboardStats {
  totalAReceber: number;
  totalRecebido: number;
  totalInadimplencia: number;
  totalAVencer: number;
  mensalidadesPendentes: number;
  mensalidadesPagas: number;
  mensalidadesAtrasadas: number;
  associadosInadimplentes: number;
}

export interface InadimplenteInfo {
  associado_id: string;
  associado_nome: string;
  total_devido: number;
  mensalidades_atrasadas: number;
  dias_maior_atraso: number;
  status_financeiro: 'regular' | 'atencao' | 'critico';
}

export const mensalidadeStatusLabels: Record<MensalidadeStatus, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
};

export const mensalidadeStatusColors: Record<MensalidadeStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  paga: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  atrasada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  suspensa: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export const formaPagamentoOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];
