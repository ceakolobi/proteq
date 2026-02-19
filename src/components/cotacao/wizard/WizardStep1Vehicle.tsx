import { useMemo, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Car, Calculator, Settings2, DollarSign, Lock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { tipoBemLabels, tiposSemFipe } from '@/types/cotacao';
import type { TipoBem, MetodoValoracao } from '@/types/cotacao';
import PlacaLookup, { type PlacaStatus, type VehicleData } from '../PlacaLookup';
import ValorBemInput from '../ValorBemInput';
import FipeSelector from '../FipeSelector';
import {
  getCategoriaByTipoVeiculo,
  validarAjusteValor,
  formatCurrency,
  parseValorBrasileiro,
  categoriaLabels,
  type Cota,
  type PerfilEditor,
  type ResultadoCotacao,
} from '@/lib/cotacaoUtils';
import type { WizardFormData } from './CotacaoWizardTypes';

interface Props {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  resultado: ResultadoCotacao | null;
  onCalcular: () => ResultadoCotacao | null;
  cotasAtivas: Cota[];
  cotasLoading: boolean;
  perfilEditor: PerfilEditor;
  errors: Record<string, string>;
  origem?: string;
}

export function WizardStep1Vehicle({
  formData, updateFormData, resultado, onCalcular, cotasAtivas, cotasLoading, perfilEditor, errors, origem = 'cotacao',
}: Props) {
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [fipeBloqueado, setFipeBloqueado] = useState(false);

  const categoriaCalculada = useMemo(() => {
    if (!formData.tipo_bem) return null;
    return getCategoriaByTipoVeiculo(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  const tipoTemFipe = useMemo(() => {
    if (!formData.tipo_bem) return true;
    return !tiposSemFipe.includes(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  const podeEditarAjuste = perfilEditor === 'ADMIN' || perfilEditor === 'GESTOR';

  useEffect(() => {
    if (!tipoTemFipe && formData.tipo_bem) {
      updateFormData({ metodo_valoracao: 'venal' as MetodoValoracao });
      setFipeBloqueado(false);
    }
  }, [formData.tipo_bem, tipoTemFipe, updateFormData]);

  const handleVehicleFound = useCallback((data: VehicleData) => {
    updateFormData({
      marca: data.marca,
      modelo: data.modelo,
      ano_fabricacao: data.ano_fabricacao,
      ano_modelo: data.ano_modelo,
      renavam: data.renavam || '',
      chassi: data.chassi || '',
      cor: data.cor || '',
      codigo_fipe: data.codigo_fipe || '',
      valor_bem: data.valor_fipe ? String(data.valor_fipe) : '',
      metodo_valoracao: data.fipeEncontrado ? 'fipe' : 'venal',
    });
    if (data.fipeEncontrado && data.valor_fipe) setFipeBloqueado(true);
  }, [updateFormData]);

  const handleFipeValorFound = useCallback((data: any) => {
    updateFormData({
      marca: data.marca,
      modelo: data.modelo,
      ano_fabricacao: String(data.anoModelo),
      ano_modelo: String(data.anoModelo),
      codigo_fipe: data.codigoFipe,
      valor_bem: String(data.valorFipe),
      metodo_valoracao: 'fipe' as MetodoValoracao,
    });
    setFipeBloqueado(true);
  }, [updateFormData]);

  const canCalculate = formData.tipo_bem && formData.marca && formData.modelo &&
    formData.ano_fabricacao && formData.valor_bem;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Type */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5" />
              Tipo do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={formData.tipo_bem}
              onValueChange={(v) => updateFormData({ tipo_bem: v as TipoBem })}
            >
              <SelectTrigger className={errors.tipo_bem ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipoBemLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_bem && <p className="text-sm text-destructive">{errors.tipo_bem}</p>}
            {categoriaCalculada && (
              <Badge variant="secondary">Categoria: {categoriaLabels[categoriaCalculada]}</Badge>
            )}
          </CardContent>
        </Card>

        {/* Placa */}
        {formData.tipo_bem && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Identificação por Placa</CardTitle>
              <CardDescription>Consulta automática dos dados</CardDescription>
            </CardHeader>
            <CardContent>
              <PlacaLookup
                value={formData.placa}
                onChange={(v) => updateFormData({ placa: v })}
                onVehicleFound={handleVehicleFound}
                onStatusChange={(s) => {
                  setPlacaStatus(s);
                  if (['not_found', 'invalid', 'found_no_fipe'].includes(s)) setFipeBloqueado(false);
                }}
                tipoTemFipe={tipoTemFipe}
                origem={origem}
              />
            </CardContent>
          </Card>
        )}

        {/* Vehicle Data */}
        {formData.tipo_bem && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5" />
                Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tipoTemFipe && !fipeBloqueado && (placaStatus === 'not_found' || placaStatus === 'idle') && (
                <FipeSelector
                  tipoBem={formData.tipo_bem as TipoBem}
                  onValorFound={handleFipeValorFound}
                  disabled={fipeBloqueado}
                  origem={origem}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input value={formData.marca} onChange={(e) => updateFormData({ marca: e.target.value })}
                    disabled={fipeBloqueado} className={errors.marca ? 'border-destructive' : ''} placeholder="Ex: Volkswagen" />
                  {errors.marca && <p className="text-xs text-destructive">{errors.marca}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input value={formData.modelo} onChange={(e) => updateFormData({ modelo: e.target.value })}
                    disabled={fipeBloqueado} className={errors.modelo ? 'border-destructive' : ''} placeholder="Ex: Gol" />
                  {errors.modelo && <p className="text-xs text-destructive">{errors.modelo}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano Fabricação *</Label>
                  <Input type="number" value={formData.ano_fabricacao} onChange={(e) => updateFormData({ ano_fabricacao: e.target.value })}
                    disabled={fipeBloqueado} className={errors.ano_fabricacao ? 'border-destructive' : ''} placeholder="Ex: 2020" />
                  {errors.ano_fabricacao && <p className="text-xs text-destructive">{errors.ano_fabricacao}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Ano Modelo</Label>
                  <Input type="number" value={formData.ano_modelo} onChange={(e) => updateFormData({ ano_modelo: e.target.value })}
                    disabled={fipeBloqueado} placeholder="Ex: 2021" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input value={formData.chassi} onChange={(e) => updateFormData({ chassi: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input value={formData.cor} onChange={(e) => updateFormData({ cor: e.target.value })} placeholder="Ex: Prata" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Valoração */}
        {formData.tipo_bem && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5" />
                Valoração do Bem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ValorBemInput
                valorBem={formData.valor_bem}
                onValorChange={(v) => updateFormData({ valor_bem: v })}
                metodoValoracao={formData.metodo_valoracao}
                onMetodoChange={(v) => updateFormData({ metodo_valoracao: v })}
                codigoFipe={formData.codigo_fipe}
                onCodigoFipeChange={(v) => updateFormData({ codigo_fipe: v })}
                fipeBloqueado={fipeBloqueado}
                tipoTemFipe={tipoTemFipe}
                error={errors.valor_bem}
              />
              <Separator />
              {podeEditarAjuste && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Ajuste Individual (R$)
                    </Label>
                    <Badge variant={formData.ajuste_individual_valor === 0 ? 'secondary' : 'default'}>
                      {formData.ajuste_individual_valor > 0 ? '+' : ''}{formatCurrency(formData.ajuste_individual_valor)}
                    </Badge>
                  </div>
                  <Input type="number" step="0.01" value={formData.ajuste_individual_valor || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const v = validarAjusteValor(perfilEditor, 'individual');
                      if (v.permitido) updateFormData({ ajuste_individual_valor: val });
                    }} className="text-right" />
                  {formData.ajuste_individual_valor !== 0 && (
                    <Textarea placeholder="Motivo do ajuste..." value={formData.motivo_ajuste}
                      onChange={(e) => updateFormData({ motivo_ajuste: e.target.value })} rows={2} />
                  )}
                </div>
              )}
              {perfilEditor === 'CONSULTOR' && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" /> Valores calculados automaticamente.
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <Label>Carro Reserva</Label>
                <Select value={formData.carro_reserva_extra}
                  onValueChange={(v: any) => updateFormData({ carro_reserva_extra: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">30 dias (inclusos)</SelectItem>
                    <SelectItem value="30dias">+30 dias (R$ 39,90/mês)</SelectItem>
                    <SelectItem value="90dias">+90 dias (R$ 59,90/mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Observações..." value={formData.observacoes}
                onChange={(e) => updateFormData({ observacoes: e.target.value })} rows={2} />
              <Button onClick={onCalcular} className="w-full" size="lg"
                disabled={cotasLoading || !canCalculate}>
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Cotação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result */}
      <div className="lg:sticky lg:top-6 space-y-6">
        {resultado ? (
          <Card className="border-primary">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Resultado
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {formData.marca} {formData.modelo} {formData.ano_fabricacao}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Mensalidade</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(resultado.valorFinal)}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge>{resultado.cotaNome}</Badge>
                  <Badge variant="secondary">{categoriaLabels[resultado.categoria]}</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Base:</span><span>{formatCurrency(resultado.valorBase)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ajuste Geral:</span><span>{formatCurrency(resultado.ajusteGeralValor)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ajuste Individual:</span><span>{formatCurrency(resultado.ajusteIndividualValor)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Valor Final:</span><span className="text-primary">{formatCurrency(resultado.valorFinal)}</span></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <p className="text-muted-foreground">Valor do Bem</p>
                  <p className="font-semibold">{formatCurrency(parseValorBrasileiro(formData.valor_bem))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Participação (7%)</p>
                  <p className="font-semibold">{formatCurrency(resultado.participacao)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Preencha os dados e calcule a cotação</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
