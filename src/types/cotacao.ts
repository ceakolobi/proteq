// Tipos para o módulo de cotação

export type TipoBem = 
  | 'carro'
  | 'moto'
  | 'pickup'
  | 'caminhao'
  | 'utilitario'
  | 'maquina_agricola'
  | 'maquina_industrial'
  | 'carreta'
  | 'implemento_agricola';

export type CotacaoStatus = 
  | 'novo'
  | 'em_contato'
  | 'interessado'
  | 'aguardando_retorno'
  | 'aprovado'
  | 'perdido';

export type MetodoValoracao = 
  | 'fipe'
  | 'venal'
  | 'nota_fiscal';

export type TipoContato = 
  | 'ligacao'
  | 'whatsapp'
  | 'retorno'
  | 'reuniao'
  | 'email'
  | 'visita';

export interface Cotacao {
  id: string;
  lead_id?: string;
  consultor_id: string;
  regiao_id?: string;
  status: CotacaoStatus;
  
  // Identificação do bem
  tipo_bem: TipoBem;
  placa?: string;
  chassi?: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo?: number;
  categoria?: string;
  cor?: string;
  renavam?: string;
  
  // Valoração
  metodo_valoracao: MetodoValoracao;
  valor_bem: number;
  valor_fipe?: number;
  codigo_fipe?: string;
  usuario_informou_valor?: string;
  data_valor_informado?: string;
  url_nota_fiscal?: string;
  
  // Cálculos
  cota_id?: string;
  mensalidade?: number;
  participacao?: number;
  carro_reserva_dias: number;
  carro_reserva_adicional: number;
  
  // Conversão
  proposta_id?: string;
  associado_id?: string;
  veiculo_id?: string;
  aprovada_em?: string;
  aprovada_por?: string;
  
  // Metadados
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CotacaoContato {
  id: string;
  cotacao_id: string;
  usuario_id: string;
  tipo: TipoContato;
  descricao: string;
  data_contato: string;
  created_at: string;
}

// Labels para exibição
export const tipoBemLabels: Record<TipoBem, string> = {
  carro: 'Carro',
  moto: 'Motocicleta',
  pickup: 'Caminhonete',
  caminhao: 'Caminhão',
  utilitario: 'Utilitário',
  maquina_agricola: 'Máquina Agrícola',
  maquina_industrial: 'Máquina Industrial',
  carreta: 'Carreta / Implemento',
  implemento_agricola: 'Implemento Agrícola',
};

// Tipos que NÃO têm FIPE (requer valor manual)
export const tiposSemFipe: TipoBem[] = [
  'maquina_agricola',
  'maquina_industrial',
  'carreta',
  'implemento_agricola',
];

export const cotacaoStatusLabels: Record<CotacaoStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  interessado: 'Interessado',
  aguardando_retorno: 'Aguardando Retorno',
  aprovado: 'Aprovado',
  perdido: 'Perdido',
};

export const cotacaoStatusColors: Record<CotacaoStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_contato: 'bg-yellow-100 text-yellow-800',
  interessado: 'bg-purple-100 text-purple-800',
  aguardando_retorno: 'bg-orange-100 text-orange-800',
  aprovado: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
};

export const metodoValoracaoLabels: Record<MetodoValoracao, string> = {
  fipe: 'Tabela FIPE',
  venal: 'Valor Venal',
  nota_fiscal: 'Nota Fiscal',
};

export const tipoContatoLabels: Record<TipoContato, string> = {
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  retorno: 'Retorno',
  reuniao: 'Reunião',
  email: 'E-mail',
  visita: 'Visita',
};

export const tipoContatoIcons: Record<TipoContato, string> = {
  ligacao: 'Phone',
  whatsapp: 'MessageCircle',
  retorno: 'PhoneCallback',
  reuniao: 'Calendar',
  email: 'Mail',
  visita: 'MapPin',
};
