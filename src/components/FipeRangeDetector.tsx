import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, DollarSign } from 'lucide-react';
import type { Cota, VehicleType } from '@/types/database';
import {
  calcularCotacaoCompleta,
  getCategoriaByTipoVeiculo,
  formatCurrency,
  type Cota as CotaUtils,
} from '@/lib/cotacaoUtils';

interface FipeRangeDetectorProps {
  valorFipe: number;
  tipoVeiculo: VehicleType;
  cotas: Cota[];
  showMensalidade?: boolean;
}

export function FipeRangeDetector({ 
  valorFipe, 
  tipoVeiculo, 
  cotas,
  showMensalidade = true 
}: FipeRangeDetectorProps) {
  const resultado = useMemo(() => {
    if (valorFipe <= 0 || cotas.length === 0) return null;
    return calcularCotacaoCompleta(
      valorFipe,
      tipoVeiculo,
      cotas as unknown as CotaUtils[]
    );
  }, [valorFipe, tipoVeiculo, cotas]);

  if (valorFipe <= 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">
          Digite o valor FIPE para identificar a faixa automaticamente.
        </p>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">Faixa não encontrada</p>
          <p className="text-xs text-destructive/80 mt-0.5">
            Não existe uma faixa FIPE configurada para o valor {formatCurrency(valorFipe)}. 
            Solicite ao administrador a criação de uma nova faixa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Faixa detectada:</span>
          <Badge variant="default" className="font-semibold">
            {resultado.cotaNome}
          </Badge>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground pl-6">
        Faixa: {formatCurrency(resultado.cota.fipe_min)} - {formatCurrency(resultado.cota.fipe_max)}
      </div>
      
      {showMensalidade && resultado.valorFinal > 0 && (
        <div className="pl-6 pt-1 space-y-1">
          <div className="text-xs text-muted-foreground">
            Base: {formatCurrency(resultado.valorBase)}
            {resultado.ajusteGeralValor !== 0 && (
              <span className="text-primary"> {resultado.ajusteGeralValor > 0 ? '+' : ''} Ajuste Geral: {formatCurrency(resultado.ajusteGeralValor)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm">
              Mensalidade: <span className="font-semibold text-primary">{formatCurrency(resultado.valorFinal)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function useFipeRange(valorFipe: number, tipoVeiculo: VehicleType, cotas: Cota[]) {
  const resultado = useMemo(() => {
    if (valorFipe <= 0 || cotas.length === 0) return null;
    return calcularCotacaoCompleta(
      valorFipe,
      tipoVeiculo,
      cotas as unknown as CotaUtils[]
    );
  }, [valorFipe, tipoVeiculo, cotas]);

  return {
    detectedCota: resultado?.cota || null,
    mensalidade: resultado?.valorFinal || 0,
    isValid: !!resultado,
    cotaId: resultado?.cotaId || null,
  };
}
