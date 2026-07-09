import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, Search, Loader2, Fuel, Palette, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { VeiculoFormData } from '../types';
import { COMBUSTIVEL_OPTIONS, COR_OPTIONS, SITUACAO_FINANCEIRA_OPTIONS } from '../types';
import { vehicleTypeLabels, type VehicleType } from '@/types/database';
import { DocumentScanner, type ScanResult } from '@/components/associado/DocumentScanner';

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
  const [isSearching, setIsSearching] = useState(false);

  const handleChange = (field: keyof VeiculoFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const searchByPlaca = async () => {
    const placaLimpa = data.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (placaLimpa.length < 7) {
      toast.error('Placa inválida');
      return;
    }

    setIsSearching(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();

        const { data: result, error } = await supabase.functions.invoke('api', {
          body: {
            route: 'placa',
            placa: placaLimpa,
          },
          headers: {
            'x-origem': 'associado_wizard',
            ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
          },
        });

      if (error) throw error;

      if (result?.success && result?.data) {
        const veiculo = result.data;
        // Limpar chassi retornado - remover asteriscos e caracteres especiais
        const chassiRetornado = (veiculo.chassi || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        // Verificar se chassi está mascarado (tinha asteriscos ou veio vazio)
        const chassiOriginal = veiculo.chassi || '';
        const chassiMascarado = !chassiRetornado || chassiOriginal.includes('*');
        
        onChange({
          ...data,
          marca: veiculo.marca || data.marca,
          modelo: veiculo.modelo || data.modelo,
          ano: veiculo.ano_fabricacao || veiculo.ano || data.ano,
          cor: veiculo.cor?.toLowerCase() || data.cor,
          combustivel: veiculo.combustivel?.toLowerCase() || data.combustivel,
          // Se chassi válido e não mascarado, preencher; senão manter valor atual
          chassi: (!chassiMascarado && chassiRetornado.length >= 17) ? chassiRetornado : data.chassi,
          renavam: veiculo.renavam?.replace(/\D/g, '') || data.renavam,
          valor_fipe: veiculo.valor_fipe || data.valor_fipe,
          codigo_fipe: veiculo.codigo_fipe || data.codigo_fipe,
        });
        
        // Informar usuário se chassi precisa ser preenchido manualmente
        if (chassiMascarado || chassiRetornado.length < 17) {
          toast.info('Chassi não disponível. Preencha manualmente.');
        }
        toast.success('Dados do veículo encontrados!');
      } else {
        toast.info('Veículo não encontrado. Preencha manualmente.');
      }
    } catch (error) {
      console.error('Error searching placa:', error);
      toast.info('Não foi possível buscar dados automaticamente. Preencha manualmente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlacaChange = (value: string) => {
    handleChange('placa', formatPlaca(value));
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

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Placa */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="placa">
            Placa <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="placa"
              placeholder="ABC-1234"
              value={data.placa}
              onChange={(e) => handlePlacaChange(e.target.value)}
              maxLength={8}
              className="uppercase"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={searchByPlaca}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite a placa para buscar dados automaticamente
          </p>
        </div>

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
          <Label htmlFor="chassi">
            Chassi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="chassi"
            placeholder="Ex: 9BWZZZ377VT004251"
            value={data.chassi}
            onChange={(e) => handleChange('chassi', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={17}
            className="uppercase font-mono tracking-wide"
          />
          <p className="text-xs text-muted-foreground">
            17 caracteres alfanuméricos
          </p>
        </div>

        {/* Renavam */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="renavam">
            Renavam <span className="text-destructive">*</span>
          </Label>
          <Input
            id="renavam"
            placeholder="Ex: 00123456789"
            value={data.renavam}
            onChange={(e) => handleChange('renavam', e.target.value.replace(/\D/g, ''))}
            maxLength={11}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            11 dígitos numéricos
          </p>
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

      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Campos obrigatórios
      </p>
    </div>
  );
}
