import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, DollarSign } from 'lucide-react';
import type { Cota, VehicleType } from '@/types/database';

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
  const detectedCota = useMemo(() => {
    if (valorFipe <= 0 || cotas.length === 0) return null;
    const caminhoneteTypes = ['pickup','caminhao','utilitario','carreta','maquina_agricola','maquina_industrial','implemento_agricola'];
    return cotas.find(c => {
      if (!c.ativo || valorFipe < c.fipe_min || valorFipe > c.fipe_max) return false;
      const ac = c as any;
      if (tipoVeiculo === 'carro' && ac.aplica_carro === false) return false;
      if (tipoVeiculo === 'moto' && ac.aplica_moto === false) return false;
      if (caminhoneteTypes.includes(tipoVeiculo) && ac.aplica_caminhonete === false) return false;
      return true;
    });
  }, [valorFipe, cotas, tipoVeiculo]);

  const mensalidadeInfo = useMemo(() => {
    if (!detectedCota) return { valorBase: 0, ajusteGeralValor: 0, valorFinal: 0 };

    // Usar novo campo ajuste_geral_valor, com fallback para acrescimo_global (legado)
    const ajusteGeralValor = Number((detectedCota as any).ajuste_geral_valor) || Number((detectedCota as any).acrescimo_global) || 0;
    let valorBase = 0;

    switch (tipoVeiculo) {
      case 'carro':
        valorBase = detectedCota.valor_carro || 0;
        break;
      case 'moto':
        valorBase = detectedCota.valor_moto || 0;
        break;
      case 'pickup':
      case 'caminhao':
      case 'utilitario':
      case 'carreta':
      case 'maquina_agricola':
      case 'maquina_industrial':
      case 'implemento_agricola':
        valorBase = detectedCota.valor_camionete || 0;
        break;
      default:
        valorBase = 0;
    }
    
    // Fórmula única: valorFinal = valorBase + ajusteGeralValor
    // O ajuste individual é aplicado no momento da cotação, não na cota
    const valorFinal = valorBase + ajusteGeralValor;
    
    return { valorBase, ajusteGeralValor, valorFinal };
  }, [detectedCota, tipoVeiculo]);

  const mensalidade = mensalidadeInfo.valorFinal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (valorFipe <= 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">
          Digite o valor FIPE para identificar a faixa automaticamente.
        </p>
      </div>
    );
  }

  if (!detectedCota) {
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
            {detectedCota.cota_nome}
          </Badge>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground pl-6">
        Faixa: {formatCurrency(detectedCota.fipe_min)} - {formatCurrency(detectedCota.fipe_max)}
      </div>
      
      {showMensalidade && mensalidade > 0 && (
        <div className="pl-6 pt-1 space-y-1">
          <div className="text-xs text-muted-foreground">
            Base: {formatCurrency(mensalidadeInfo.valorBase)}
            {mensalidadeInfo.ajusteGeralValor !== 0 && (
              <span className="text-primary"> {mensalidadeInfo.ajusteGeralValor > 0 ? '+' : ''} Ajuste Geral: {formatCurrency(mensalidadeInfo.ajusteGeralValor)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm">
              Mensalidade: <span className="font-semibold text-primary">{formatCurrency(mensalidade)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function useFipeRange(valorFipe: number, tipoVeiculo: VehicleType, cotas: Cota[]) {
  const detectedCota = useMemo(() => {
    if (valorFipe <= 0 || cotas.length === 0) return null;
    const caminhoneteTypes = ['pickup','caminhao','utilitario','carreta','maquina_agricola','maquina_industrial','implemento_agricola'];
    return cotas.find(c => {
      if (!c.ativo || valorFipe < c.fipe_min || valorFipe > c.fipe_max) return false;
      const ac = c as any;
      if (tipoVeiculo === 'carro' && ac.aplica_carro === false) return false;
      if (tipoVeiculo === 'moto' && ac.aplica_moto === false) return false;
      if (caminhoneteTypes.includes(tipoVeiculo) && ac.aplica_caminhonete === false) return false;
      return true;
    });
  }, [valorFipe, cotas, tipoVeiculo]);

  const mensalidade = useMemo(() => {
    if (!detectedCota) return 0;

    // Usar novo campo ajuste_geral_valor, com fallback para acrescimo_global (legado)
    const ajusteGeralValor = Number((detectedCota as any).ajuste_geral_valor) || Number((detectedCota as any).acrescimo_global) || 0;
    let valorBase = 0;

    switch (tipoVeiculo) {
      case 'carro':
        valorBase = detectedCota.valor_carro || 0;
        break;
      case 'moto':
        valorBase = detectedCota.valor_moto || 0;
        break;
      case 'pickup':
      case 'caminhao':
      case 'utilitario':
      case 'carreta':
      case 'maquina_agricola':
      case 'maquina_industrial':
      case 'implemento_agricola':
        valorBase = detectedCota.valor_camionete || 0;
        break;
      default:
        valorBase = 0;
    }

    // Fórmula única: valorFinal = valorBase + ajusteGeralValor
    return valorBase + ajusteGeralValor;
  }, [detectedCota, tipoVeiculo]);

  return {
    detectedCota,
    mensalidade,
    isValid: !!detectedCota,
    cotaId: detectedCota?.id || null,
  };
}