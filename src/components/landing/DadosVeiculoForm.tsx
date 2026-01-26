import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Car, Loader2, Search, CheckCircle2, Settings2, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TIPOS_VEICULO_LANDING, type DadosVeiculo } from './types';
import { cn } from '@/lib/utils';

interface DadosVeiculoFormProps {
  onSubmit: (data: DadosVeiculo) => void;
  onBack: () => void;
  loading?: boolean;
}

interface FipeItem {
  id: string;
  nome: string;
}

interface FipeValorResult {
  tipoVeiculo: string;
  valor: number;
  valorFormatado: string;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
}

type PlacaStatus = 'idle' | 'loading' | 'found_fipe' | 'found_no_fipe' | 'not_found' | 'invalid' | 'error';

// Validação de placa brasileira
const validatePlaca = (placa: string): boolean => {
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return padraoAntigo.test(cleanPlaca) || padraoMercosul.test(cleanPlaca);
};

const formatPlaca = (value: string): string => {
  const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + '-' + clean.slice(3, 7);
};

// Map tipo_bem to categoria label
const getCategoriaLabel = (tipo: string): string => {
  switch (tipo) {
    case 'carro': return 'Carro';
    case 'moto': return 'Moto';
    case 'pickup': return 'Caminhonete';
    case 'caminhao': return 'Caminhão';
    case 'utilitario': return 'Utilitário';
    default: return tipo;
  }
};

export function DadosVeiculoForm({ onSubmit, onBack, loading }: DadosVeiculoFormProps) {
  // Tipo do bem
  const [tipoVeiculo, setTipoVeiculo] = useState<'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario'>('carro');
  
  // Placa
  const [placa, setPlaca] = useState('');
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [placaMessage, setPlacaMessage] = useState('');
  
  // Seleção manual FIPE
  const [marcas, setMarcas] = useState<FipeItem[]>([]);
  const [modelos, setModelos] = useState<FipeItem[]>([]);
  const [anos, setAnos] = useState<FipeItem[]>([]);
  const [selectedMarcaId, setSelectedMarcaId] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [selectedAnoId, setSelectedAnoId] = useState('');
  const [valorEncontrado, setValorEncontrado] = useState<FipeValorResult | null>(null);
  
  // Loading states
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);
  const [loadingValor, setLoadingValor] = useState(false);

  // Função para fazer requisições à API FIPE (pública)
  const fetchFipe = async (endpoint: string, params: Record<string, string>) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/fipe/${endpoint}?${queryString}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-origem': 'landing',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
    return data;
  };

  // Buscar marcas quando tipo mudar
  const fetchMarcas = useCallback(async () => {
    setLoadingMarcas(true);
    setMarcas([]);
    setModelos([]);
    setAnos([]);
    setSelectedMarcaId('');
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);

    try {
      const response = await fetchFipe('marcas', { tipo: tipoVeiculo });
      setMarcas(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoadingMarcas(false);
    }
  }, [tipoVeiculo]);

  // Buscar modelos quando marca mudar
  const fetchModelos = useCallback(async (marcaId: string) => {
    if (!marcaId) return;
    
    setLoadingModelos(true);
    setModelos([]);
    setAnos([]);
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);

    try {
      const response = await fetchFipe('modelos', { tipo: tipoVeiculo, marcaId });
      setModelos(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar modelos FIPE:', error);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoadingModelos(false);
    }
  }, [tipoVeiculo]);

  // Buscar anos quando modelo mudar
  const fetchAnos = useCallback(async (modeloId: string) => {
    if (!selectedMarcaId || !modeloId) return;
    
    setLoadingAnos(true);
    setAnos([]);
    setSelectedAnoId('');
    setValorEncontrado(null);

    try {
      const response = await fetchFipe('anos', { 
        tipo: tipoVeiculo, 
        marcaId: selectedMarcaId, 
        modeloId 
      });
      setAnos(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar anos FIPE:', error);
      toast.error('Erro ao carregar anos');
    } finally {
      setLoadingAnos(false);
    }
  }, [tipoVeiculo, selectedMarcaId]);

  // Buscar valor FIPE
  const fetchValor = useCallback(async () => {
    if (!selectedMarcaId || !selectedModeloId || !selectedAnoId) return;
    
    setLoadingValor(true);
    setValorEncontrado(null);

    try {
      const response = await fetchFipe('valor', {
        tipo: tipoVeiculo,
        marcaId: selectedMarcaId,
        modeloId: selectedModeloId,
        anoId: selectedAnoId,
      });
      
      setValorEncontrado(response.data as FipeValorResult);
      toast.success('Valor FIPE encontrado!');
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar valor FIPE');
    } finally {
      setLoadingValor(false);
    }
  }, [tipoVeiculo, selectedMarcaId, selectedModeloId, selectedAnoId]);

  // Carregar marcas quando tipo mudar
  useEffect(() => {
    fetchMarcas();
  }, [tipoVeiculo, fetchMarcas]);

  // Handlers
  const handleMarcaChange = (value: string) => {
    setSelectedMarcaId(value);
    fetchModelos(value);
  };

  const handleModeloChange = (value: string) => {
    setSelectedModeloId(value);
    fetchAnos(value);
  };

  const handleAnoChange = (value: string) => {
    setSelectedAnoId(value);
  };

  const handleTipoChange = (value: string) => {
    setTipoVeiculo(value as typeof tipoVeiculo);
    setMarcas([]);
    setModelos([]);
    setAnos([]);
    setSelectedMarcaId('');
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);
  };

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlaca(e.target.value);
    setPlaca(formatted);
    
    if (placaStatus !== 'idle' && placaStatus !== 'loading') {
      setPlacaStatus('idle');
      setPlacaMessage('');
    }
  };

  // Consulta placa - para landing, vai direto ao modo manual
  const handlePlacaSearch = () => {
    if (placa.length >= 7) {
      // Para landing page, consulta por placa requer auth
      // Então informamos e mantemos modo manual
      toast.info('Para agilizar, selecione o veículo pela tabela FIPE abaixo');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (valorEncontrado) {
      onSubmit({
        tipo_bem: tipoVeiculo,
        marca: valorEncontrado.marca,
        modelo: valorEncontrado.modelo,
        ano: valorEncontrado.anoModelo,
        placa: placa ? placa.replace(/-/g, '') : undefined,
        valor_fipe: valorEncontrado.valor,
        codigo_fipe: valorEncontrado.codigoFipe,
      });
    }
  };

  const isComplete = selectedMarcaId && selectedModeloId && selectedAnoId;

  const getPlacaStatusBadge = () => {
    switch (placaStatus) {
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
      default:
        return null;
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-8 px-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Nova Cotação</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ETAPA 1: Tipo do Bem */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5" />
                1. Tipo do Bem
              </CardTitle>
              <CardDescription>
                A categoria será definida automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={tipoVeiculo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo do veículo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEICULO_LANDING.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Exibir categoria calculada */}
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Badge variant="secondary" className="text-sm">
                  Categoria: {getCategoriaLabel(tipoVeiculo)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  (definida automaticamente)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ETAPA 2: Placa */}
          <Card className="border-2 border-primary/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Identificação por Placa
              </CardTitle>
              <CardDescription>
                Digite a placa para consulta automática dos dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Placa do Veículo
                </Label>
                {getPlacaStatusBadge()}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={placa}
                    onChange={handlePlacaChange}
                    placeholder="ABC-1234"
                    maxLength={8}
                    disabled={placaStatus === 'loading'}
                    className={cn(
                      "text-xl font-mono tracking-wider h-14 text-center uppercase",
                      "border-2 transition-colors",
                      placaStatus === 'found_fipe' && "border-green-500 bg-green-50 dark:bg-green-950",
                      placaStatus === 'idle' && placa.length === 0 && "border-primary/50",
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  onClick={handlePlacaSearch}
                  disabled={placaStatus === 'loading' || placa.length < 7}
                >
                  {placaStatus === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Digite a placa e pressione Tab ou clique na lupa para consultar automaticamente
              </p>
            </CardContent>
          </Card>

          {/* ETAPA 3: Dados do Veículo / FIPE */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5" />
                3. Dados do Veículo
              </CardTitle>
              <CardDescription>
                Preencha manualmente ou busque na tabela FIPE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FIPE Selector */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Buscar na Tabela FIPE</Label>
                  {valorEncontrado && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      FIPE encontrada
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Marca */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Marca</Label>
                    <Select
                      value={selectedMarcaId}
                      onValueChange={handleMarcaChange}
                      disabled={loadingMarcas}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingMarcas ? "Carregando..." : "Selecione a..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {marcas.map((marca) => (
                          <SelectItem key={marca.id} value={marca.id}>
                            {marca.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Modelo */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Modelo</Label>
                    <Select
                      value={selectedModeloId}
                      onValueChange={handleModeloChange}
                      disabled={!selectedMarcaId || loadingModelos}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingModelos ? "Carregando..." : "Selecione o..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelos.map((modelo) => (
                          <SelectItem key={modelo.id} value={modelo.id}>
                            {modelo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ano */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ano</Label>
                    <Select
                      value={selectedAnoId}
                      onValueChange={handleAnoChange}
                      disabled={!selectedModeloId || loadingAnos}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingAnos ? "Carregando..." : "Selecione o..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map((ano) => (
                          <SelectItem key={ano.id} value={ano.id}>
                            {ano.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Botão de buscar valor */}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={fetchValor}
                  disabled={!isComplete || loadingValor}
                >
                  {loadingValor ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buscando valor...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Buscar Valor FIPE
                    </>
                  )}
                </Button>

                {/* Resultado */}
                {valorEncontrado && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {valorEncontrado.marca} {valorEncontrado.modelo}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Ano: {valorEncontrado.anoModelo} | Código: {valorEncontrado.codigoFipe}
                        </p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">
                          Ref: {valorEncontrado.mesReferencia}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                          {valorEncontrado.valorFormatado}
                        </p>
                        <p className="text-xs text-green-600/50 dark:text-green-400/50">
                          Origem: FIPE
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões de navegação */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!valorEncontrado || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  Calcular Cotação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
