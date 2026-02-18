import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, CheckCircle2 } from 'lucide-react';
import { SignaturePad } from '../SignaturePad';
import { formatCurrency } from '@/lib/cotacaoUtils';
import type { ResultadoCotacao } from '@/lib/cotacaoUtils';
import type { WizardFormData } from './CotacaoWizardTypes';

interface Props {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  resultado: ResultadoCotacao | null;
  errors: Record<string, string>;
  empresaNome: string;
}

export function WizardStep3Terms({ formData, updateFormData, resultado, errors, empresaNome }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary */}
      {resultado && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Resumo da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Veículo</p>
                <p className="font-semibold text-sm">{formData.marca} {formData.modelo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mensalidade</p>
                <p className="font-bold text-primary">{formatCurrency(resultado.valorFinal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Participação</p>
                <p className="font-semibold text-sm">{formatCurrency(resultado.participacao)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-semibold text-sm truncate">{formData.cliente_nome || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coberturas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Coberturas Incluídas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              'Roubo e Furto 100% FIPE',
              'Fenômenos da Natureza',
              'Cobertura para Terceiros',
              'Incêndio',
              'Guincho 24h (500 km)',
              'Assistência 24h',
              'Carro Reserva',
              'Vidros e Para-brisa',
              'Pane Elétrica e Mecânica',
              'Pane Seca',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Termos e Condições
          </CardTitle>
          <CardDescription>Leia atentamente os termos antes de aceitar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-48 rounded-lg border p-4">
            <div className="text-sm text-muted-foreground space-y-3">
              <p className="font-semibold text-foreground">{empresaNome} - Termos de Proteção Veicular</p>
              <p>1. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.</p>
              <p>2. O período de carência é de 72 horas para todas as coberturas, exceto Furto/Roubo que tem cobertura imediata.</p>
              <p>3. O valor da mensalidade pode sofrer reajuste conforme tabela FIPE vigente na data de renovação.</p>
              <p>4. A participação do associado (cota de participação) corresponde a 7% do valor FIPE do veículo no momento do sinistro.</p>
              <p>5. O carro reserva está disponível pelo período contratado, conforme plano selecionado.</p>
              <p>6. O guincho tem limite de 500 km (250 km ida e 250 km volta) e 3 acionamentos por ano.</p>
              <p>7. A suspensão do contrato será imediata em caso de inadimplência.</p>
              <p>8. Esta proposta tem validade de 7 dias a partir da data de emissão.</p>
              <p>9. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação.</p>
              <p>10. Ao aceitar esta proposta, o associado declara estar ciente e de acordo com todas as condições estabelecidas.</p>
            </div>
          </ScrollArea>

          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="termos"
              checked={formData.termos_aceitos}
              onCheckedChange={(checked) => updateFormData({ termos_aceitos: checked === true })}
            />
            <div className="space-y-1">
              <Label htmlFor="termos" className="text-sm font-medium cursor-pointer">
                Li e aceito os termos e condições *
              </Label>
              <p className="text-xs text-muted-foreground">
                Declaro que li, entendi e concordo com todos os termos acima.
              </p>
            </div>
          </div>
          {errors.termos_aceitos && <p className="text-sm text-destructive">{errors.termos_aceitos}</p>}
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle>Assinatura Digital</CardTitle>
          <CardDescription>Assine abaixo para confirmar o aceite (opcional nesta etapa)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <SignaturePad
            onSignatureChange={(dataUrl) => updateFormData({ assinatura_cliente: dataUrl })}
            width={400}
            height={150}
          />
          {formData.assinatura_cliente && (
            <Badge variant="secondary" className="mt-2">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Assinatura capturada
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
