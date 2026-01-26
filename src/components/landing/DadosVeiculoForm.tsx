import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Car, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
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

type PlacaStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'invalid';
type FipeMode = 'placa' | 'manual';

// Validação de placa brasileira
const validatePlaca = (placa: string): boolean => {
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return padraoAntigo.test(cleanPlaca) || padraoMercosul.test(cleanPlaca);
};

const formatPlaca = (value: string) => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
};

export function DadosVeiculoForm({ onSubmit, onBack, loading }: DadosVeiculoFormProps) {
  // Modo: placa (auto) ou manual
  const [mode, setMode] = useState<FipeMode>('placa');
  
  // Dados da placa
  const [placa, setPlaca] = useState('');
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [placaMessage, setPlacaMessage] = useState('');
  
  // Dados do veículo encontrado via placa
  const [veiculoPlaca, setVeiculoPlaca] = useState<{
    marca: string;
    modelo: string;
    ano: number;
    valorFipe: number;
    codigoFipe: string;
  } | null>(null);
  
  // Seleção manual FIPE
  const [tipoVeiculo, setTipoVeiculo] = useState<'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario'>('carro');
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
    if (mode !== 'manual') return;
    
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
  }, [tipoVeiculo, mode]);

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
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar valor FIPE');
    } finally {
      setLoadingValor(false);
    }
  }, [tipoVeiculo, selectedMarcaId, selectedModeloId, selectedAnoId]);

  // Carregar marcas quando entrar em modo manual
  useEffect(() => {
    if (mode === 'manual') {
      fetchMarcas();
    }
  }, [mode, tipoVeiculo, fetchMarcas]);

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

  // Consultar placa - usa a mesma API, sem autenticação para landing
  const consultarPlaca = async () => {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (!validatePlaca(cleanPlaca)) {
      setPlacaStatus('invalid');
      setPlacaMessage('Formato não reconhecido. Use ABC1234 ou ABC1D23');
      return;
    }

    setPlacaStatus('loading');
    setPlacaMessage('Consultando veículo...');
    setVeiculoPlaca(null);

    try {
      // Consulta placa não é permitida sem auth, então vamos pular para modo manual
      // Para landing page, apenas oferecemos o modo manual por enquanto
      // A consulta por placa requer API_PLACAS_KEY que precisa de autenticação
      
      setPlacaStatus('not_found');
      setPlacaMessage('Para agilizar, preencha os dados manualmente abaixo.');
      setMode('manual');
      
    } catch (err) {
      console.error('[PlacaLookup] Erro:', err);
      setPlacaStatus('not_found');
      setPlacaMessage('Erro ao consultar. Preencha os dados manualmente.');
      setMode('manual');
    }
  };

  const handlePlacaSearch = () => {
    if (placa.length >= 7) {
      // Ir direto para modo manual pois placa requer auth
      setMode('manual');
      toast.info('Para agilizar, selecione o veículo manualmente');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se encontrou via placa
    if (mode === 'placa' && veiculoPlaca) {
      onSubmit({
        tipo_bem: tipoVeiculo,
        marca: veiculoPlaca.marca,
        modelo: veiculoPlaca.modelo,
        ano: veiculoPlaca.ano,
        placa: placa || undefined,
        valor_fipe: veiculoPlaca.valorFipe,
        codigo_fipe: veiculoPlaca.codigoFipe,
      });
      return;
    }
    
    // Se preencheu manualmente
    if (valorEncontrado) {
      onSubmit({
        tipo_bem: tipoVeiculo,
        marca: valorEncontrado.marca,
        modelo: valorEncontrado.modelo,
        ano: valorEncontrado.anoModelo,
        placa: placa || undefined,
        valor_fipe: valorEncontrado.valor,
        codigo_fipe: valorEncontrado.codigoFipe,
      });
    }
  };

  const isComplete = mode === 'manual' && selectedMarcaId && selectedModeloId && selectedAnoId;
  const hasResult = mode === 'placa' ? !!veiculoPlaca : !!valorEncontrado;

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dados do veículo</CardTitle>
          <CardDescription>Informe os dados do veículo para calcular a proteção</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Placa - Primeiro para auto-preenchimento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="placa" className="font-semibold">Placa do veículo</Label>
                {placaStatus === 'loading' && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Consultando
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="placa"
                  placeholder="ABC1234"
                  value={placa}
                  onChange={(e) => setPlaca(formatPlaca(e.target.value))}
                  maxLength={7}
                  className={cn(
                    "text-lg font-mono tracking-wider h-12 text-center uppercase flex-1",
                    "border-2 transition-colors",
                    placaStatus === 'found' && "border-primary bg-primary/10",
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={handlePlacaSearch}
                  disabled={placa.length < 7 || placaStatus === 'loading'}
                >
                  <Search className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'placa' 
                  ? 'Digite a placa ou preencha os dados abaixo' 
                  : 'Placa opcional - preencha os dados do veículo abaixo'}
              </p>
            </div>

            {/* Tipo de veículo */}
            <div className="space-y-2">
              <Label>Tipo de veículo</Label>
              <Select value={tipoVeiculo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEICULO_LANDING.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select 
                value={selectedMarcaId} 
                onValueChange={handleMarcaChange}
                disabled={loadingMarcas}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMarcas ? "Carregando..." : "Selecione a marca"} />
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
              <Label>Modelo</Label>
              <Select 
                value={selectedModeloId} 
                onValueChange={handleModeloChange}
                disabled={!selectedMarcaId || loadingModelos}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingModelos ? "Carregando..." : "Selecione o modelo"} />
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
              <Label>Ano</Label>
              <Select 
                value={selectedAnoId} 
                onValueChange={handleAnoChange}
                disabled={!selectedModeloId || loadingAnos}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingAnos ? "Carregando..." : "Selecione o ano"} />
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

            {/* Botão de buscar valor */}
            {isComplete && !valorEncontrado && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={fetchValor}
                disabled={loadingValor}
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
            )}

            {/* Resultado FIPE */}
            {valorEncontrado && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Valor FIPE encontrado</span>
                    </div>
                    <p className="font-semibold">
                      {valorEncontrado.marca} {valorEncontrado.modelo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ano: {valorEncontrado.anoModelo} | Código: {valorEncontrado.codigoFipe}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {valorEncontrado.valorFormatado}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!hasResult || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    Simular proteção
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
