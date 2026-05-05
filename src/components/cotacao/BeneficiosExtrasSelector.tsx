import { useBeneficiosExtrasAtivos, type BeneficioExtra } from '@/hooks/useBeneficiosExtras';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface Props {
  tipoBem?: string;
  selecionados: string[]; // ids dos benefícios marcados
  onChange: (ids: string[], beneficios: BeneficioExtra[]) => void;
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BeneficiosExtrasSelector({ tipoBem, selecionados, onChange }: Props) {
  const { data: beneficios, isLoading } = useBeneficiosExtrasAtivos(tipoBem);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (!beneficios || beneficios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum benefício extra disponível no momento.
      </p>
    );
  }

  const toggle = (b: BeneficioExtra) => {
    const isSel = selecionados.includes(b.id);
    const novos = isSel
      ? selecionados.filter(id => id !== b.id)
      : [...selecionados, b.id];
    const objs = beneficios.filter(x => novos.includes(x.id));
    onChange(novos, objs);
  };

  const totalExtra = beneficios
    .filter(b => selecionados.includes(b.id))
    .reduce((acc, b) => acc + Number(b.valor_mensal || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {beneficios.map(b => {
          const isSel = selecionados.includes(b.id);
          const IconComp = (Icons as any)[b.icone || 'Sparkles'] || Sparkles;
          return (
            <Card
              key={b.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSel ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : ''
              }`}
              onClick={() => toggle(b)}
            >
              <CardContent className="p-4 flex gap-3">
                <Checkbox checked={isSel} onCheckedChange={() => toggle(b)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <IconComp className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="font-semibold text-sm">{b.nome}</h4>
                  </div>
                  {b.descricao && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {b.descricao}
                    </p>
                  )}
                  <Badge variant={isSel ? 'default' : 'secondary'} className="text-xs">
                    + {formatBRL(Number(b.valor_mensal))}/mês
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalExtra > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selecionados.length} benefício(s) extra(s) selecionado(s)
          </span>
          <span className="font-bold text-primary">
            + {formatBRL(totalExtra)}/mês
          </span>
        </div>
      )}
    </div>
  );
}
