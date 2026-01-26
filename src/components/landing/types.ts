// Types for Landing Page Public Quotation Flow

export interface DadosPessoais {
  nome: string;
  telefone: string;
  email: string;
}

export interface DadosVeiculo {
  tipo_bem: 'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario';
  marca: string;
  modelo: string;
  ano: number;
  placa?: string;
  valor_fipe: number;
  codigo_fipe: string;
}

export interface ResultadoCotacaoPublica {
  mensalidade: number;
  participacao: number;
  valorFipe: number;
  cotaNome: string;
  beneficios: string[];
}

export interface DadosCompletos {
  pessoais: DadosPessoais;
  veiculo: DadosVeiculo;
  cotacao: ResultadoCotacaoPublica | null;
}

export type EtapaFunil = 'hero' | 'dados_pessoais' | 'dados_veiculo' | 'resultado' | 'pagamento' | 'contrato' | 'finalizado';

export const TIPOS_VEICULO_LANDING = [
  { value: 'carro', label: 'Carro' },
  { value: 'moto', label: 'Moto' },
  { value: 'pickup', label: 'Caminhonete / Pickup' },
  { value: 'caminhao', label: 'Caminhão' },
  { value: 'utilitario', label: 'Utilitário / Van' },
] as const;

export const BENEFICIOS_PROTECAO = [
  { icon: 'Shield', titulo: 'Proteção contra roubo e furto', descricao: 'Cobertura total em caso de perda' },
  { icon: 'Headphones', titulo: 'Assistência 24h', descricao: 'Suporte a qualquer hora' },
  { icon: 'MapPin', titulo: 'Rastreamento veicular', descricao: 'Localização em tempo real' },
  { icon: 'Percent', titulo: 'Até 100% da FIPE', descricao: 'Indenização integral' },
  { icon: 'Smartphone', titulo: 'Processo 100% digital', descricao: 'Sem burocracia' },
  { icon: 'Truck', titulo: 'Guincho 500km', descricao: '250km ida e volta' },
] as const;
