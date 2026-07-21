import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, Fuel, Palette, Gauge, Calculator } from 'lucide-react';
import type { VeiculoFormData } from '../types';
import { COMBUSTIVEL_OPTIONS, COR_OPTIONS, SITUACAO_FINANCEIRA_OPTIONS } from '../types';
import { vehicleTypeLabels, type VehicleType } from '@/types/database';
import { DocumentScanner, type ScanResult } from '@/components/associado/DocumentScanner';
import PlacaLookup, { type VehicleData } from '@/components/cotacao/PlacaLookup';
import { useMensalidadeCalculada } from '@/hooks/useMensalidadeCalculada';

interface DadosVeiculoStepProps {
  data: VeiculoFormData;
  onChange: (data: VeiculoFormData) => void;
  onDocumentScanned?: (result: ScanResult) => void;
}

const formatPlaca = (value: string): string => {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + '-' + clean.slice(3, 7);
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function DadosVeiculoStep({ data, onChange, onDocumentScanned }: DadosVeiculoStepProps) {
  const handleChange = (field: keyof VeiculoFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Fonte única: preview de mensalidade recalculado ao vivo (igual ao CotacaoForm)
  const { resultado: previewMensalidade } = useMensalidadeCalculada({
    valorFipe: data.valor_fipe,
    tipo: data.tipo,
  });

  // Busca de placa via componente compartilhado PlacaLookup (mesmo do CotacaoForm)
  const handleVehicleFound = (v: VehicleData) => {
    const chassiRetornado = (v.chassi || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    onChange({
      ...data,
      marca: v.marca || data.marca,
      modelo: v.modelo || data.modelo,
      ano: v.ano_fabricacao ? Number(v.ano_fabricacao) || data.ano : data.ano,
      cor: v.cor?.toLowerCase() || data.cor,
      combustivel: v.combustivel?.toLowerCase() || data.combustivel,
      chassi: chassiRetornado.length >= 17 ? chassiRetornado : data.chassi,
      renavam: v.renavam?.replace(/\D/g, '') || data.renavam,
      valor_fipe: v.valor_fipe || data.valor_fipe,
      codigo_fipe: v.codigo_fipe || data.codigo_fipe,
    });
  };

  const handleValorFipeChange = (value: string) => {
    // Remove tudo exceto números
    const numericValue = value.replace(/\D/g, '');
    handleChange('valor_fipe', Number(numericValue) / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Dados do Veículo</h3>
        </div>
        <DocumentScanner
          documentKind="crlv"
          onScanned={onDocumentScanned}
          onExtracted={(extracted) => {
            const placa = extracted.placa as string | undefined;
            onChange({
              ...data,
              placa: placa ? formatPlaca(placa.replace(/[^A-Za-z0-9]/g, '')) : data.placa,
              chassi: (extracted.chassi as string)?.toUpperCase().replace(/[^A-Z0-9]/g, '') || data.chassi,
              renavam: (extracted.renavam as string)?.replace(/\D/g, '') || data.renavam,
              marca: (extracted.marca as string) || data.marca,
              modelo: (extracted.modelo as string) || data.modelo,
              ano: (extracted.ano_fabricacao as number) || data.ano,
              cor: (extracted.cor as string) || data.cor,
              combustivel: (extracted.combustivel as string) || data.combustivel,
            });
          }}
        />
      </div>

      <PlacaLookup
        value={data.placa}
        onChange={(value) => handleChange('placa', value)}
        onVehicleFound={handleVehicleFound}
        onStatusChange={() => {}}
        origem="associado_wizard"
      />

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Tipo */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="tipo">
            Tipo de Veículo <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.tipo}
            onValueChange={(value) => handleChange('tipo', value as VehicleType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Situação Financeira */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="situacao">Situação</Label>
          <Select
            value={data.situacao_financeira}
            onValueChange={(value) => handleChange('situacao_financeira', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {SITUACAO_FINANCEIRA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marca */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="marca">
            Marca <span className="text-destructive">*</span>
          </Label>
          <Input
            id="marca"
            placeholder="Ex: Toyota"
            value={data.marca}
            onChange={(e) => handleChange('marca', e.target.value)}
          />
        </div>

        {/* Modelo */}
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="modelo">
            Modelo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="modelo"
            placeholder="Ex: Corolla XEi 2.0"
            value={data.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
          />
        </div>

        {/* Ano */}
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="ano">
            Ano <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ano"
            type="number"
            placeholder="2024"
            value={data.ano}
            onChange={(e) => handleChange('ano', Number(e.target.value))}
            min={1900}
            max={new Date().getFullYear() + 1}
          />
        </div>

        {/* Valor FIPE */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="valor_fipe">
            Valor FIPE <span className="text-destructive">*</span>
          </Label>
          <Input
            id="valor_fipe"
            placeholder="R$ 0,00"
            value={data.valor_fipe > 0 ? formatCurrency(data.valor_fipe) : ''}
            onChange={(e) => handleValorFipeChange(e.target.value)}
          />
        </div>

        {/* Combustível */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="combustivel">Combustível</Label>
          <Select
            value={data.combustivel}
            onValueChange={(value) => handleChange('combustivel', value)}
          >
            <SelectTrigger>
              <Fuel className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {COMBUSTIVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cor */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="cor">Cor</Label>
          <Select
            value={data.cor}
            onValueChange={(value) => handleChange('cor', value)}
          >
            <SelectTrigger>
              <Palette className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {COR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chassi */}
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="chassi">Chassi</Label>
          <Input
            id="chassi"
            placeholder="Ex: 9BWZZZ377VT004251"
            value={data.chassi}
            onChange={(e) => handleChange('chassi', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={17}
            className="uppercase font-mono tracking-wide"
          />
        </div>

        {/* Renavam */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="renavam">Renavam</Label>
          <Input
            id="renavam"
            placeholder="Ex: 00123456789"
            value={data.renavam}
            onChange={(e) => handleChange('renavam', e.target.value.replace(/\D/g, ''))}
            maxLength={11}
            className="font-mono"
          />
        </div>

        {/* Quilometragem */}
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="quilometragem">KM</Label>
          <div className="relative">
            <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="quilometragem"
              type="number"
              placeholder="0"
              className="pl-10"
              value={data.quilometragem || ''}
              onChange={(e) => handleChange('quilometragem', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {data.valor_fipe > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Resumo Financeiro</h4>
          </div>
          {previewMensalidade ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor FIPE</span>
                <span className="font-medium">{formatCurrency(data.valor_fipe)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Mensalidade base ({previewMensalidade.cotaNome})
                </span>
                <span className="font-semibold text-primary">
                  {formatCurrency(previewMensalidade.valorFinal)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Não há faixa de cota ativa para este valor FIPE. Verifique com o administrador.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Campos obrigatórios
      </p>
    </div>
  );
}
