import { useMemo } from 'react';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  calcularCotacaoCompleta,
  type Cota,
  type ResultadoCotacao,
} from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';

interface UseMensalidadeCalculadaParams {
  valorFipe: number;
  tipo: VehicleType | '' | null | undefined;
  ajusteIndividual?: number;
  carroReservaExtra?: 'nenhum' | 'mais15' | 'mais30';
}

interface UseMensalidadeCalculadaResult {
  resultado: ResultadoCotacao | null;
  cotasAtivas: Cota[];
  isLoading: boolean;
}

/**
 * Fonte única de busca-de-cotas + cálculo de mensalidade.
 *
 * Carrega as cotas ao vivo (useReferenceData), filtra as ativas e calcula a
 * mensalidade via calcularCotacaoCompleta. Usado tanto no CotacaoForm quanto no
 * wizard de cadastro de associado para que os dois nunca divirjam.
 */
export function useMensalidadeCalculada({
  valorFipe,
  tipo,
  ajusteIndividual = 0,
  carroReservaExtra,
}: UseMensalidadeCalculadaParams): UseMensalidadeCalculadaResult {
  const { cotas, isLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });

  const cotasAtivas = useMemo(
    () => (cotas as Cota[]).filter((c) => c.ativo),
    [cotas]
  );

  const resultado = useMemo<ResultadoCotacao | null>(() => {
    if (!tipo || !valorFipe || valorFipe <= 0) return null;
    return calcularCotacaoCompleta(
      valorFipe,
      tipo as VehicleType,
      cotasAtivas,
      ajusteIndividual,
      carroReservaExtra
    );
  }, [valorFipe, tipo, cotasAtivas, ajusteIndividual, carroReservaExtra]);

  return { resultado, cotasAtivas, isLoading };
}
