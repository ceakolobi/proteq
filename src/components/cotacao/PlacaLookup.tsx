import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, CheckCircle2, AlertCircle, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleData {
  placa?: string;
  marca: string;
  modelo: string;
  versao?: string;
  ano_fabricacao: string;
  ano_modelo: string;
  renavam?: string;
  chassi?: string;
  cor?: string;
  combustivel?: string;
  municipio?: string;
  uf?: string;
  situacao?: string;
  valor_fipe?: number;
  codigo_fipe?: string;
  fipeEncontrado: boolean;
}

export type PlacaStatus = 
  | 'idle' 
  | 'loading' 
  | 'found_fipe' 
  | 'found_no_fipe' 
  | 'not_found' 
  | 'invalid'
  | 'error';

interface PlacaLookupProps {
  value: string;
  onChange: (value: string) => void;
  onVehicleFound: (data: VehicleData) => void;
  onStatusChange: (status: PlacaStatus) => void;
  disabled?: boolean;
  tipoTemFipe?: boolean;
}

// Validação de placa brasileira (padrão antigo ABC-1234 ou Mercosul ABC1D23)
const validatePlaca = (placa: string): boolean => {
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  // Padrão antigo: 3 letras + 4 números
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  
  return padraoAntigo.test(cleanPlaca) || padraoMercosul.test(cleanPlaca);
};

// Formatar placa para exibição
const formatPlaca = (value: string): string => {
  const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + '-' + clean.slice(3, 7);
};

export default function PlacaLookup({
  value,
  onChange,
  onVehicleFound,
  onStatusChange,
  disabled = false,
  tipoTemFipe = true,
}: PlacaLookupProps) {
  const [status, setStatus] = useState<PlacaStatus>('idle');
  const [message, setMessage] = useState('');

  const updateStatus = useCallback((newStatus: PlacaStatus) => {
    setStatus(newStatus);
    onStatusChange(newStatus);
  }, [onStatusChange]);

  // Consulta por placa via API
  const consultarPlaca = useCallback(async (placa: string) => {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (!validatePlaca(cleanPlaca)) {
      updateStatus('invalid');
      setMessage('Formato não reconhecido. Use AAA-1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }

    updateStatus('loading');
    setMessage('Consultando veículo...');

    try {
      const { data: result, error } = await supabase.functions.invoke('api', {
        body: { route: 'placa', placa: cleanPlaca },
        headers: { 'x-origem': 'cotacao' },
      });

      if (error) {
        console.error('[PlacaLookup] Erro na chamada:', error);
        const detailed =
          (error as any)?.context?.body?.error ||
          (error as any)?.context?.error ||
          (error as any)?.message ||
          'Erro ao consultar. Preencha os dados manualmente.';

        updateStatus('error');
        setMessage(detailed);
        return;
      }

      if (!result?.success) {
        console.log('[PlacaLookup] Erro na consulta:', result?.error);
        updateStatus('not_found');
        setMessage(result?.error || 'Veículo não encontrado. Preencha os dados manualmente.');
        return;
      }

      const vehicleData = result.data;
      console.log('[PlacaLookup] Veículo encontrado:', vehicleData);

      // Determinar status baseado em se tem FIPE
      if (vehicleData.fipeEncontrado && vehicleData.valor_fipe) {
        updateStatus('found_fipe');
        setMessage(`${vehicleData.marca} ${vehicleData.modelo} - FIPE: R$ ${vehicleData.valor_fipe.toLocaleString('pt-BR')}`);
      } else if (!tipoTemFipe) {
        updateStatus('found_no_fipe');
        setMessage(`${vehicleData.marca} ${vehicleData.modelo} encontrado. Tipo sem tabela FIPE.`);
      } else {
        updateStatus('found_no_fipe');
        setMessage(`${vehicleData.marca} ${vehicleData.modelo} encontrado. Valor FIPE não disponível.`);
      }

      // Callback com dados do veículo
      onVehicleFound({
        placa: vehicleData.placa,
        marca: vehicleData.marca || '',
        modelo: vehicleData.modelo || '',
        versao: vehicleData.versao,
        ano_fabricacao: vehicleData.ano_fabricacao?.toString() || '',
        ano_modelo: vehicleData.ano_modelo?.toString() || '',
        chassi: vehicleData.chassi,
        cor: vehicleData.cor,
        combustivel: vehicleData.combustivel,
        municipio: vehicleData.municipio,
        uf: vehicleData.uf,
        situacao: vehicleData.situacao,
        valor_fipe: vehicleData.valor_fipe,
        codigo_fipe: vehicleData.codigo_fipe,
        fipeEncontrado: vehicleData.fipeEncontrado,
      });

    } catch (err) {
      console.error('[PlacaLookup] Erro:', err);
      updateStatus('error');
      setMessage('Erro ao consultar. Preencha os dados manualmente.');
    }
  }, [updateStatus, tipoTemFipe, onVehicleFound]);

  const handleBlur = useCallback(() => {
    if (value.length >= 7) {
      consultarPlaca(value);
    }
  }, [value, consultarPlaca]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlaca(e.target.value);
    onChange(formatted);
    
    // Reset status quando digita
    if (status !== 'idle' && status !== 'loading') {
      updateStatus('idle');
      setMessage('');
    }
  };

  const handleSearch = () => {
    if (value.length >= 7) {
      consultarPlaca(value);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Consultando
          </Badge>
        );
      case 'found_fipe':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            FIPE encontrada
          </Badge>
        );
      case 'found_no_fipe':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-500 text-yellow-950">
            <AlertCircle className="w-3 h-3" />
            Sem FIPE
          </Badge>
        );
      case 'not_found':
        return (
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <AlertCircle className="w-3 h-3" />
            Não encontrado
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="outline" className="gap-1 border-muted-foreground/50 text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            Formato inválido
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Car className="w-4 h-4" />
          Placa do Veículo
        </Label>
        {getStatusBadge()}
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="ABC-1234"
            maxLength={8}
            disabled={disabled || status === 'loading'}
            className={cn(
              "text-xl font-mono tracking-wider h-14 text-center uppercase",
              "border-2 transition-colors",
              status === 'found_fipe' && "border-green-500 bg-green-50 dark:bg-green-950",
              status === 'found_no_fipe' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
              status === 'invalid' && "border-destructive bg-destructive/10",
              status === 'error' && "border-destructive bg-destructive/10",
              status === 'idle' && value.length === 0 && "border-primary/50",
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14"
          onClick={handleSearch}
          disabled={disabled || status === 'loading' || value.length < 7}
        >
          {status === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </Button>
      </div>

      {message && (
        <p className={cn(
          "text-sm",
          status === 'found_fipe' && "text-green-600 dark:text-green-400",
          status === 'found_no_fipe' && "text-yellow-600 dark:text-yellow-400",
          status === 'not_found' && "text-muted-foreground",
          status === 'invalid' && "text-muted-foreground",
          status === 'error' && "text-destructive",
        )}>
          {message}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Digite a placa e pressione Tab ou clique na lupa para consultar automaticamente
      </p>
    </div>
  );
}
