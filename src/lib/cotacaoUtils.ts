import type { Cota, VehicleType } from '@/types/database';

export interface CotaExtendida extends Cota {
  mensalidade_caminhao?: number;
  mensalidade_utilitario?: number;
  mensalidade_maquina_agricola?: number;
  mensalidade_maquina_industrial?: number;
  mensalidade_carreta?: number;
  mensalidade_implemento_agricola?: number;
}

export interface ResultadoCalculo {
  cota: CotaExtendida;
  mensalidade: number;
  participacao: number;
  cotaId: string;
}

/**
 * Busca a cota apropriada baseada no valor FIPE
 * Condições: fipe_min <= valorFipe AND fipe_max >= valorFipe AND ativo = true
 */
export function buscarCotaPorFipe(
  valorFipe: number,
  cotas: CotaExtendida[]
): CotaExtendida | null {
  if (valorFipe <= 0 || cotas.length === 0) return null;

  return cotas.find(
    cota => valorFipe >= cota.fipe_min && valorFipe <= cota.fipe_max && cota.ativo
  ) || null;
}

/**
 * Obtém o valor base da mensalidade pelo tipo de veículo
 */
export function getValorBasePorTipo(
  cota: CotaExtendida,
  tipoVeiculo: VehicleType
): number {
  switch (tipoVeiculo) {
    case 'carro':
      return Number(cota.valor_carro) || 0;
    case 'moto':
      return Number(cota.valor_moto) || 0;
    case 'pickup':
      return Number(cota.valor_camionete) || 0;
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
    default:
      return Number(cota.valor_camionete) || 0;
  }
}

/**
 * Calcula a mensalidade aplicando os percentuais
 * Fórmula:
 *   total_percentual = percentual_geral + percentual_extra
 *   valor_final = valor_base + (valor_base * total_percentual / 100)
 */
export function calcularMensalidade(
  cota: CotaExtendida,
  tipoVeiculo: VehicleType,
  carroReservaExtra?: 'nenhum' | '30dias' | '90dias'
): number {
  const valorBase = getValorBasePorTipo(cota, tipoVeiculo);
  const percentualGeral = Number(cota.percentual_geral) || 0;
  const percentualExtra = Number(cota.percentual_extra) || 0;

  // Somar percentuais e aplicar sobre o valor base
  const totalPercentual = percentualGeral + percentualExtra;
  let mensalidade = valorBase + (valorBase * totalPercentual / 100);

  // Adicionar carro reserva extra
  if (carroReservaExtra === '30dias') {
    mensalidade += 39.90;
  } else if (carroReservaExtra === '90dias') {
    mensalidade += 59.90;
  }

  return mensalidade;
}

/**
 * Calcula a participação (7% do valor FIPE)
 */
export function calcularParticipacao(valorFipe: number): number {
  return valorFipe * 0.07;
}

/**
 * Calcula a cotação completa (busca cota + calcula mensalidade + participação)
 */
export function calcularCotacaoCompleta(
  valorFipe: number,
  tipoVeiculo: VehicleType,
  cotas: CotaExtendida[],
  carroReservaExtra?: 'nenhum' | '30dias' | '90dias'
): ResultadoCalculo | null {
  const cota = buscarCotaPorFipe(valorFipe, cotas);
  
  if (!cota) return null;

  const mensalidade = calcularMensalidade(cota, tipoVeiculo, carroReservaExtra);
  const participacao = calcularParticipacao(valorFipe);

  return {
    cota,
    mensalidade,
    participacao,
    cotaId: cota.id,
  };
}
