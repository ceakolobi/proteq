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
import logoHarmony from '@/assets/logo-harmony-colorida.png';

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

  // Consulta placa via API pública
  const handlePlacaSearch = async () => {
    if (placa.length < 7) return;
    
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (!validatePlaca(cleanPlaca)) {
      setPlacaStatus('invalid');
      setPlacaMessage('Formato não reconhecido. Use AAA-1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }

    setPlacaStatus('loading');
    setPlacaMessage('Consultando veículo...');

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-origem': 'landing',
        },
        body: JSON.stringify({ route: 'placa', placa: cleanPlaca }),
      });

      const result = await response.json();

      if (!result?.success) {
        console.log('[PlacaLookup] Erro na consulta:', result?.error);
        setPlacaStatus('not_found');
        setPlacaMessage(result?.error || 'Veículo não encontrado. Use a tabela FIPE abaixo.');
        return;
      }

      const vehicleData = result.data;
      console.log('[PlacaLookup] Veículo encontrado:', vehicleData);

      // Determinar status baseado em se tem FIPE
      if (vehicleData.fipeEncontrado && vehicleData.valor_fipe) {
        setPlacaStatus('found_fipe');
        setPlacaMessage(`${vehicleData.marca} ${vehicleData.modelo} - FIPE: R$ ${vehicleData.valor_fipe.toLocaleString('pt-BR')}`);
        
        // Preencher automaticamente com os dados da placa
        setValorEncontrado({
          tipoVeiculo: tipoVeiculo,
          valor: vehicleData.valor_fipe,
          valorFormatado: `R$ ${vehicleData.valor_fipe.toLocaleString('pt-BR')}`,
          marca: vehicleData.marca || '',
          modelo: vehicleData.modelo || '',
          anoModelo: vehicleData.ano_modelo || vehicleData.ano_fabricacao,
          combustivel: vehicleData.combustivel || '',
          codigoFipe: vehicleData.codigo_fipe || '',
          mesReferencia: vehicleData.mes_referencia || '',
        });

        // Propagar para os selects de Marca/Modelo/Ano (best-effort match por nome)
        autoSelectFipeFromNames(
          vehicleData.marca || '',
          vehicleData.modelo || '',
          vehicleData.ano_modelo || vehicleData.ano_fabricacao
        ).catch((e) => console.warn('[FIPE auto-select] falhou:', e));
        
        toast.success('Veículo encontrado com valor FIPE!');
      } else {
        setPlacaStatus('found_no_fipe');
        setPlacaMessage(`${vehicleData.marca} ${vehicleData.modelo} encontrado. Use a tabela FIPE para o valor.`);
        toast.info('Veículo encontrado, mas sem valor FIPE. Selecione manualmente abaixo.');
      }

    } catch (err) {
      console.error('[PlacaLookup] Erro:', err);
      setPlacaStatus('error');
      setPlacaMessage('Erro ao consultar. Use a tabela FIPE abaixo.');
    }
  };

  // Normaliza string para comparação (uppercase, sem acento, sem espaços extras)
  const normalize = (s: string) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();

  // Tenta selecionar Marca/Modelo/Ano automaticamente a partir dos nomes retornados pela placa
  const autoSelectFipeFromNames = async (marcaNome: string, modeloNome: string, anoModelo: number | string) => {
    if (!marcaNome) return;

    // 1) Marcas
    setLoadingMarcas(true);
    let marcasList: FipeItem[] = [];
    try {
      const resp = await fetchFipe('marcas', { tipo: tipoVeiculo });
      marcasList = resp.data as FipeItem[];
      setMarcas(marcasList);
    } finally {
      setLoadingMarcas(false);
    }

    const marcaAlvo = normalize(marcaNome);

    // Match por palavras sig. (>= 2 chars) — resolve "VOLKSWAGEN" ↔ "VW - VolksWagen", "CHEVROLET" ↔ "GM - Chevrolet"
    const wordMatch = (hay: string, needle: string) => {
      const split = (s: string) => s.split(/[\s\-\/]+/).filter(w => w.length >= 2);
      const wH = split(hay), wN = split(needle);
      return wH.some(h => wN.some(n => h === n || h.includes(n) || n.includes(h)));
    };

    const marcaMatch =
      marcasList.find((m) => normalize(m.nome) === marcaAlvo) ||
      marcasList.find((m) => normalize(m.nome).startsWith(marcaAlvo)) ||
      marcasList.find((m) => marcaAlvo.startsWith(normalize(m.nome))) ||
      marcasList.find((m) => wordMatch(normalize(m.nome), marcaAlvo));
    if (!marcaMatch) return;
    setSelectedMarcaId(marcaMatch.id);

    // 2) Modelos
    setLoadingModelos(true);
    let modelosList: FipeItem[] = [];
    try {
      const resp = await fetchFipe('modelos', { tipo: tipoVeiculo, marcaId: marcaMatch.id });
      modelosList = resp.data as FipeItem[];
      setModelos(modelosList);
    } finally {
      setLoadingModelos(false);
    }

    const modeloAlvo = normalize(modeloNome);
    const modeloMatch =
      modelosList.find((m) => normalize(m.nome) === modeloAlvo) ||
      modelosList.find((m) => normalize(m.nome).startsWith(modeloAlvo)) ||
      modelosList.find((m) => modeloAlvo && normalize(m.nome).includes(modeloAlvo)) ||
      modelosList.find((m) => modeloAlvo && modeloAlvo.includes(normalize(m.nome)));
    if (!modeloMatch) return;
    setSelectedModeloId(modeloMatch.id);

    // 3) Anos
    setLoadingAnos(true);
    let anosList: FipeItem[] = [];
    try {
      const resp = await fetchFipe('anos', {
        tipo: tipoVeiculo,
        marcaId: marcaMatch.id,
        modeloId: modeloMatch.id,
      });
      anosList = resp.data as FipeItem[];
      setAnos(anosList);
    } finally {
      setLoadingAnos(false);
    }

    const anoStr = String(anoModelo || '');
    const anoMatch =
      anosList.find((a) => a.id.startsWith(`${anoStr}-`)) ||
      anosList.find((a) => a.nome.startsWith(anoStr)) ||
      anosList.find((a) => a.id === anoStr);
    if (anoMatch) setSelectedAnoId(anoMatch.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!valorEncontrado) {
      toast.error('Busque o valor FIPE antes de continuar');
      return;
    }

    console.log('[DadosVeiculoForm] Enviando:', {
      tipo_bem: tipoVeiculo,
      marca: valorEncontrado.marca,
      modelo: valorEncontrado.modelo,
      ano: valorEncontrado.anoModelo,
      valor_fipe: valorEncontrado.valor,
    });

    onSubmit({
      tipo_bem: tipoVeiculo,
      marca: valorEncontrado.marca,
      modelo: valorEncontrado.modelo,
      ano: valorEncontrado.anoModelo,
      placa: placa ? placa.replace(/-/g, '') : undefined,
      valor_fipe: valorEncontrado.valor,
      codigo_fipe: valorEncontrado.codigoFipe,
    });
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
          <Badge className="gap-1 bg-green-600 text-green-50">
            <CheckCircle2 className="w-3 h-3" />
            FIPE encontrada
          </Badge>
        );
      case 'found_no_fipe':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-600 text-yellow-50">
            Sem FIPE
          </Badge>
        );
      case 'not_found':
        return (
          <Badge variant="secondary" className="gap-1">
            Não encontrado
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="outline" className="gap-1">
            Formato inválido
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-8 px-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex flex-col items-center text-center mb-6 gap-3">
          <img src={logoHarmony} alt="Proteq" className="h-14 object-contain" />
          <h1 className="text-2xl font-bold">Nova Cotação</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-8">
              {/* SEÇÃO 1: Tipo do Bem */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-semibold">1. Tipo do Bem</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-1">
                  A categoria será definida automaticamente
                </p>

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

                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <Badge variant="secondary" className="text-sm">
                    Categoria: {getCategoriaLabel(tipoVeiculo)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    (definida automaticamente)
                  </span>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* SEÇÃO 2: Placa */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                  <h2 className="text-base font-semibold">Identificação por Placa</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-1">
                  Digite a placa para consulta automática dos dados
                </p>

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
              </div>

              <div className="border-t border-border" />

              {/* SEÇÃO 3: Dados do Veículo / FIPE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-semibold">3. Dados do Veículo</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-1">
                  Preencha manualmente ou busque na tabela FIPE
                </p>

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
