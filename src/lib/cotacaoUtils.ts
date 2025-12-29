import type { VehicleType } from '@/types/database';

// ==========================================
// TIPOS E INTERFACES
// ==========================================

/**
 * Categorias de cota conforme regras de negócio
 * CARRO | MOTO | CAMINHONETE
 */
export type CotaCategoria = 'CARRO' | 'MOTO' | 'CAMINHONETE';

/**
 * Perfil do editor para regras de permissão
 */
export type PerfilEditor = 'ADMIN' | 'GESTOR' | 'CONSULTOR';

/**
 * Interface da Cota com todos os campos necessários
 */
export interface Cota {
  id: string;
  cota_nome: string;
  categoria?: string | null;
  fipe_min: number;
  fipe_max: number;
  valor_carro: number | null;
  valor_moto: number | null;
  valor_camionete: number | null;
  percentual_geral?: number | null;
  percentual_extra?: number | null;
  ativo: boolean;
  mensalidade_caminhao?: number | null;
  mensalidade_utilitario?: number | null;
  mensalidade_maquina_agricola?: number | null;
  mensalidade_maquina_industrial?: number | null;
  mensalidade_carreta?: number | null;
  mensalidade_implemento_agricola?: number | null;
  // Campos de aplicabilidade por categoria
  aplica_carro?: boolean;
  aplica_moto?: boolean;
  aplica_caminhonete?: boolean;
}

/**
 * Resultado do cálculo de cotação
 */
export interface ResultadoCotacao {
  cota: Cota;
  categoria: CotaCategoria;
  valorBase: number;
  percentualGlobal: number;
  percentualIndividual: number;
  valorFinal: number;
  participacao: number;
  cotaId: string;
  cotaNome: string;
}

/**
 * Validação de ajuste de percentual
 */
export interface ValidacaoAjuste {
  permitido: boolean;
  mensagem?: string;
  limiteMin?: number;
  limiteMax?: number;
}

// ==========================================
// MAPEAMENTO DE TIPO PARA CATEGORIA
// ==========================================

/**
 * Mapeia o tipo de veículo (VehicleType) para a categoria da cota
 * 
 * REGRAS:
 * - carro → CARRO
 * - moto → MOTO
 * - pickup, caminhao, utilitario, carreta → CAMINHONETE
 * - maquina_agricola, maquina_industrial, implemento_agricola → CAMINHONETE
 */
export function getCategoriaByTipoVeiculo(tipoVeiculo: VehicleType): CotaCategoria {
  switch (tipoVeiculo) {
    case 'moto':
      return 'MOTO';
    case 'carro':
      return 'CARRO';
    case 'pickup':
    case 'caminhao':
    case 'utilitario':
    case 'carreta':
    case 'maquina_agricola':
    case 'maquina_industrial':
    case 'implemento_agricola':
      return 'CAMINHONETE';
    default:
      return 'CARRO';
  }
}

// ==========================================
// BUSCA DE COTA
// ==========================================

/**
 * Busca a COTA correta automaticamente baseada no valor FIPE e categoria
 * 
 * REGRAS:
 * 1. Procurar na tabela cotas
 * 2. FIPE deve estar entre fipe_min e fipe_max
 * 3. Considerar apenas ativo = true
 * 4. Considerar aplica_carro/moto/caminhonete conforme categoria
 * 5. Retornar a cota encontrada ou null
 */
export function buscarCotaPorFipe(
  valorFipe: number,
  cotas: Cota[],
  categoria?: CotaCategoria
): Cota | null {
  if (valorFipe <= 0 || cotas.length === 0) return null;

  // Filtrar cotas ativas, na faixa FIPE e que se aplicam à categoria
  const cotaEncontrada = cotas.find(cota => {
    // Verificar se está ativa
    if (cota.ativo !== true) return false;
    
    // Verificar se está na faixa FIPE
    if (valorFipe < cota.fipe_min || valorFipe > cota.fipe_max) return false;
    
    // Verificar aplicabilidade por categoria (se categoria informada)
    if (categoria) {
      switch (categoria) {
        case 'CARRO':
          if (cota.aplica_carro === false) return false;
          break;
        case 'MOTO':
          if (cota.aplica_moto === false) return false;
          break;
        case 'CAMINHONETE':
          if (cota.aplica_caminhonete === false) return false;
          break;
      }
    }
    
    return true;
  });

  return cotaEncontrada || null;
}

// ==========================================
// OBTENÇÃO DO VALOR BASE POR CATEGORIA
// ==========================================

/**
 * Seleciona o valor conforme categoria
 * 
 * REGRAS:
 * - Se categoria = CARRO → usar valor_carro
 * - Se categoria = MOTO → usar valor_moto
 * - Se categoria = CAMINHONETE → usar valor_camionete
 * 
 * Para tipos especiais, usa campos específicos se existirem:
 * - caminhao → mensalidade_caminhao ou valor_camionete * 1.3
 * - utilitario → mensalidade_utilitario ou valor_camionete * 1.1
 * - maquina_agricola → mensalidade_maquina_agricola ou valor_camionete * 1.5
 * - etc.
 */
export function getValorBasePorCategoria(
  cota: Cota,
  categoria: CotaCategoria,
  tipoVeiculo?: VehicleType
): number {
  // Se tem tipo específico, verificar se há campo especial
  if (tipoVeiculo) {
    switch (tipoVeiculo) {
      case 'caminhao':
        return Number(cota.mensalidade_caminhao) || Number(cota.valor_camionete) * 1.3;
      case 'utilitario':
        return Number(cota.mensalidade_utilitario) || Number(cota.valor_camionete) * 1.1;
      case 'maquina_agricola':
        return Number(cota.mensalidade_maquina_agricola) || Number(cota.valor_camionete) * 1.5;
      case 'maquina_industrial':
        return Number(cota.mensalidade_maquina_industrial) || Number(cota.valor_camionete) * 1.5;
      case 'carreta':
        return Number(cota.mensalidade_carreta) || Number(cota.valor_camionete) * 1.2;
      case 'implemento_agricola':
        return Number(cota.mensalidade_implemento_agricola) || Number(cota.valor_camionete) * 1.3;
    }
  }

  // Usar categoria para obter valor base
  switch (categoria) {
    case 'CARRO':
      return Number(cota.valor_carro) || 0;
    case 'MOTO':
      return Number(cota.valor_moto) || 0;
    case 'CAMINHONETE':
      return Number(cota.valor_camionete) || 0;
    default:
      return Number(cota.valor_carro) || 0;
  }
}

// ==========================================
// CÁLCULO DA MENSALIDADE
// ==========================================

/**
 * Calcula o valor final aplicando percentuais
 * 
 * FÓRMULA:
 * valor_final = valor_base + (valor_base * percentual_global/100) + (valor_base * percentual_individual/100)
 * 
 * OU SEJA (equivalente):
 * total_percentual = percentual_global + percentual_individual
 * valor_final = valor_base + (valor_base * total_percentual / 100)
 * 
 * @param valorBase - Valor base da cota pela categoria
 * @param percentualGlobal - Percentual geral da cota (admin controla)
 * @param percentualIndividual - Percentual de ajuste (gestor pode ajustar)
 */
export function calcularValorFinal(
  valorBase: number,
  percentualGlobal: number,
  percentualIndividual: number
): number {
  const totalPercentual = percentualGlobal + percentualIndividual;
  return valorBase + (valorBase * totalPercentual / 100);
}

/**
 * Calcula a participação (7% do valor FIPE)
 */
export function calcularParticipacao(valorFipe: number): number {
  return valorFipe * 0.07;
}

// ==========================================
// VALIDAÇÃO DE PERMISSÕES
// ==========================================

/**
 * Valida se o perfil pode ajustar o percentual individual
 * 
 * REGRAS:
 * - ADMIN: pode editar qualquer percentual, sem limite
 * - GESTOR: só pode alterar percentual individual, limite ±15%
 * - CONSULTOR: apenas visualizar, sem editar valores
 */
export function validarAjustePercentual(
  perfil: PerfilEditor,
  percentualIndividual: number
): ValidacaoAjuste {
  switch (perfil) {
    case 'ADMIN':
      // Admin sem restrições
      return { permitido: true };

    case 'GESTOR':
      // Gestor com limite ±15%
      if (percentualIndividual < -15 || percentualIndividual > 15) {
        return {
          permitido: false,
          mensagem: 'Gestor só pode ajustar até ±15%. Solicite aprovação do Administrador.',
          limiteMin: -15,
          limiteMax: 15
        };
      }
      return { permitido: true, limiteMin: -15, limiteMax: 15 };

    case 'CONSULTOR':
      // Consultor não pode editar
      return {
        permitido: false,
        mensagem: 'Consultor não tem permissão para editar valores.'
      };

    default:
      return {
        permitido: false,
        mensagem: 'Perfil não reconhecido.'
      };
  }
}

/**
 * Determina o perfil do editor baseado nas roles do sistema
 */
export function getPerfilEditor(
  roles: string[],
  isAdminPrincipal: boolean
): PerfilEditor {
  // Admin principal ou admin_regional = ADMIN
  if (isAdminPrincipal || roles.includes('admin_principal') || roles.includes('admin_regional')) {
    return 'ADMIN';
  }
  
  // Cadastro = GESTOR (pode ajustar com limites)
  if (roles.includes('cadastro')) {
    return 'GESTOR';
  }
  
  // Consultor de vendas = CONSULTOR (apenas visualização)
  if (roles.includes('consultor_vendas')) {
    return 'CONSULTOR';
  }
  
  // Default = CONSULTOR (sem permissões)
  return 'CONSULTOR';
}

// ==========================================
// FUNÇÃO PRINCIPAL: CÁLCULO COMPLETO
// ==========================================

/**
 * Calcula a cotação completa
 * 
 * PROCESSO:
 * 1. Buscar a COTA correta automaticamente
 * 2. Determinar a categoria pelo tipo de veículo
 * 3. Selecionar o valor_base conforme categoria
 * 4. Aplicar percentuais (global + individual)
 * 5. Calcular participação (7% do FIPE)
 * 
 * @param valorFipe - Valor do veículo (FIPE ou informado)
 * @param tipoVeiculo - Tipo do veículo
 * @param cotas - Lista de cotas disponíveis
 * @param percentualIndividual - Ajuste individual (opcional, default 0)
 * @param carroReservaExtra - Carro reserva adicional
 */
export function calcularCotacaoCompleta(
  valorFipe: number,
  tipoVeiculo: VehicleType,
  cotas: Cota[],
  percentualIndividual: number = 0,
  carroReservaExtra?: 'nenhum' | '30dias' | '90dias'
): ResultadoCotacao | null {
  // 1. Determinar categoria primeiro (necessário para busca)
  const categoria = getCategoriaByTipoVeiculo(tipoVeiculo);

  // 2. Buscar a COTA correta (filtrando por categoria)
  const cota = buscarCotaPorFipe(valorFipe, cotas, categoria);
  if (!cota) return null;

  // 3. Selecionar valor_base conforme categoria
  const valorBase = getValorBasePorCategoria(cota, categoria, tipoVeiculo);

  // 4. Obter percentuais
  const percentualGlobal = Number(cota.percentual_geral) || 0;

  // 5. Calcular valor final
  let valorFinal = calcularValorFinal(valorBase, percentualGlobal, percentualIndividual);

  // Adicionar carro reserva extra
  if (carroReservaExtra === '30dias') {
    valorFinal += 39.90;
  } else if (carroReservaExtra === '90dias') {
    valorFinal += 59.90;
  }

  // 6. Calcular participação (7% do FIPE)
  const participacao = calcularParticipacao(valorFipe);

  return {
    cota,
    categoria,
    valorBase,
    percentualGlobal,
    percentualIndividual,
    valorFinal,
    participacao,
    cotaId: cota.id,
    cotaNome: cota.cota_nome,
  };
}

// ==========================================
// UTILITÁRIOS
// ==========================================

/**
 * Formata valor para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Parse de valor brasileiro para número
 */
export function parseValorBrasileiro(valor: string): number {
  // Trata tanto formato brasileiro (1.234,56) quanto americano (1234.56)
  const cleaned = valor.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Labels das categorias
 */
export const categoriaLabels: Record<CotaCategoria, string> = {
  'CARRO': 'Carro',
  'MOTO': 'Moto',
  'CAMINHONETE': 'Caminhonete/Pickup/Caminhão'
};
