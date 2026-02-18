import type { TipoBem, MetodoValoracao } from '@/types/cotacao';
import type { ResultadoCotacao } from '@/lib/cotacaoUtils';

export interface WizardFormData {
  // Step 1 - Vehicle & Plan
  tipo_bem: TipoBem | '';
  placa: string;
  chassi: string;
  marca: string;
  modelo: string;
  ano_fabricacao: string;
  ano_modelo: string;
  cor: string;
  renavam: string;
  metodo_valoracao: MetodoValoracao;
  valor_bem: string;
  codigo_fipe: string;
  carro_reserva_extra: 'nenhum' | '30dias' | '90dias';
  observacoes: string;
  ajuste_individual_valor: number;
  motivo_ajuste: string;

  // Step 2 - Client
  cliente_nome: string;
  cliente_cpf: string;
  cliente_email: string;
  cliente_whatsapp: string;
  cliente_endereco: string;
  cliente_tipo: 'pf' | 'pj';

  // Step 3 - Terms
  termos_aceitos: boolean;
  assinatura_cliente: string | null;
}

export interface WizardState {
  currentStep: number;
  formData: WizardFormData;
  resultado: ResultadoCotacao | null;
  cotacaoId: string | null;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  isSendingEmail: boolean;
  isSaving: boolean;
}

export const WIZARD_STEPS = [
  { number: 1, title: 'Veículo & Plano', description: 'Dados e valoração' },
  { number: 2, title: 'Dados do Cliente', description: 'Informações pessoais' },
  { number: 3, title: 'Contrato & Termos', description: 'Aceite e assinatura' },
  { number: 4, title: 'Gerar & Enviar', description: 'PDF e compartilhamento' },
] as const;

export const INITIAL_FORM_DATA: WizardFormData = {
  tipo_bem: '',
  placa: '',
  chassi: '',
  marca: '',
  modelo: '',
  ano_fabricacao: '',
  ano_modelo: '',
  cor: '',
  renavam: '',
  metodo_valoracao: 'fipe',
  valor_bem: '',
  codigo_fipe: '',
  carro_reserva_extra: 'nenhum',
  observacoes: '',
  ajuste_individual_valor: 0,
  motivo_ajuste: '',
  cliente_nome: '',
  cliente_cpf: '',
  cliente_email: '',
  cliente_whatsapp: '',
  cliente_endereco: '',
  cliente_tipo: 'pf',
  termos_aceitos: false,
  assinatura_cliente: null,
};
