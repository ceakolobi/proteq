import type { VehicleType } from '@/types/database';

export interface AssociadoFormData {
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  estado_civil: string;
  profissao: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  dia_vencimento: number;
}

export const DIA_VENCIMENTO_OPTIONS = [
  { value: 5, label: 'Dia 05' },
  { value: 10, label: 'Dia 10' },
  { value: 15, label: 'Dia 15' },
  { value: 20, label: 'Dia 20' },
  { value: 25, label: 'Dia 25' },
  { value: 30, label: 'Dia 30' },
];

export interface VeiculoFormData {
  placa: string;
  chassi: string;
  renavam: string;
  marca: string;
  modelo: string;
  ano: number;
  combustivel: string;
  cor: string;
  categoria: string;
  quilometragem: number;
  situacao_financeira: 'financiado' | 'quitado';
  tipo: VehicleType;
  valor_fipe: number;
  codigo_fipe: string;
}

export interface DocumentoUpload {
  tipo: string;
  file: File | null;
  preview?: string;
  label: string;
}

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

export const COMBUSTIVEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'flex', label: 'Flex' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gnv', label: 'GNV' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const COR_OPTIONS = [
  { value: 'branco', label: 'Branco' },
  { value: 'preto', label: 'Preto' },
  { value: 'prata', label: 'Prata' },
  { value: 'cinza', label: 'Cinza' },
  { value: 'vermelho', label: 'Vermelho' },
  { value: 'azul', label: 'Azul' },
  { value: 'verde', label: 'Verde' },
  { value: 'amarelo', label: 'Amarelo' },
  { value: 'marrom', label: 'Marrom' },
  { value: 'bege', label: 'Bege' },
  { value: 'outro', label: 'Outra' },
];

export const SITUACAO_FINANCEIRA_OPTIONS = [
  { value: 'quitado', label: 'Quitado' },
  { value: 'financiado', label: 'Financiado' },
];

export const ESTADOS_BRASILEIROS = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];
