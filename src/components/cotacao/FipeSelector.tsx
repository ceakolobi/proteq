import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, CheckCircle2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { TipoBem } from '@/types/cotacao';
import { supabase } from '@/integrations/supabase/client';

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

interface FipeApiResponse {
  success: boolean;
  data: FipeItem[] | FipeValorResult;
  meta: {
    origem: string;
    cache: boolean;
    consultadoEm: string;
    mesReferencia?: string;
  };
  error?: string;
}

interface FipeSelectorProps {
  tipoBem: TipoBem;
  onValorFound: (data: {
    marca: string;
    modelo: string;
    anoModelo: number;
    valorFipe: number;
    codigoFipe: string;
    mesReferencia: string;
    combustivel?: string;
    origemDados: 'FIPE';
    cacheHit: boolean;
    consultadoEm: string;
  }) => void;
  disabled?: boolean;
  initialMarca?: string;
  initialModelo?: string;
}

export default function FipeSelector({
  tipoBem,
  onValorFound,
  disabled = false,
}: FipeSelectorProps) {
  const [marcas, setMarcas] = useState<FipeItem[]>([]);
  const [modelos, setModelos] = useState<FipeItem[]>([]);
  const [anos, setAnos] = useState<FipeItem[]>([]);
  
  const [selectedMarcaId, setSelectedMarcaId] = useState<string>('');
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [selectedAnoId, setSelectedAnoId] = useState<string>('');
  
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);
  const [loadingValor, setLoadingValor] = useState(false);
  
  const [valorEncontrado, setValorEncontrado] = useState<FipeValorResult | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ cache: boolean; consultadoEm: string } | null>(null);

  // Função para fazer requisições à API FIPE com autenticação
  const fetchFipe = async (endpoint: string, params: Record<string, string>) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/fipe/${endpoint}?${queryString}`;
    
    // Pegar token de autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        'Content-Type': 'application/json',
        'x-origem': 'web',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }
    
    const data: FipeApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
    return data;
  };

  // Buscar marcas ao montar ou quando tipo mudar
  const fetchMarcas = useCallback(async () => {
    setLoadingMarcas(true);
    setMarcas([]);
    setModelos([]);
    setAnos([]);
    setSelectedMarcaId('');
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);
    setCacheInfo(null);

    try {
      const response = await fetchFipe('marcas', { tipo: tipoBem });
      setMarcas(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoadingMarcas(false);
    }
  }, [tipoBem]);

  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  // Buscar modelos quando marca mudar
  const fetchModelos = useCallback(async (marcaId: string) => {
    if (!marcaId) return;
    
    setLoadingModelos(true);
    setModelos([]);
    setAnos([]);
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);
    setCacheInfo(null);

    try {
      const response = await fetchFipe('modelos', { tipo: tipoBem, marcaId });
      setModelos(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar modelos FIPE:', error);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoadingModelos(false);
    }
  }, [tipoBem]);

  // Buscar anos quando modelo mudar
  const fetchAnos = useCallback(async (modeloId: string) => {
    if (!selectedMarcaId || !modeloId) return;
    
    setLoadingAnos(true);
    setAnos([]);
    setSelectedAnoId('');
    setValorEncontrado(null);
    setCacheInfo(null);

    try {
      const response = await fetchFipe('anos', { 
        tipo: tipoBem, 
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
  }, [tipoBem, selectedMarcaId]);

  // Buscar valor quando ano mudar
  const fetchValor = useCallback(async () => {
    if (!selectedMarcaId || !selectedModeloId || !selectedAnoId) return;
    
    setLoadingValor(true);
    setValorEncontrado(null);
    setCacheInfo(null);

    try {
      const response = await fetchFipe('valor', {
        tipo: tipoBem,
        marcaId: selectedMarcaId,
        modeloId: selectedModeloId,
        anoId: selectedAnoId,
      });
      
      const valorData = response.data as FipeValorResult;
      setValorEncontrado(valorData);
      setCacheInfo({
        cache: response.meta.cache,
        consultadoEm: response.meta.consultadoEm,
      });
      
      onValorFound({
        marca: valorData.marca,
        modelo: valorData.modelo,
        anoModelo: valorData.anoModelo,
        valorFipe: valorData.valor,
        codigoFipe: valorData.codigoFipe,
        mesReferencia: valorData.mesReferencia,
        combustivel: valorData.combustivel,
        origemDados: 'FIPE',
        cacheHit: response.meta.cache,
        consultadoEm: response.meta.consultadoEm,
      });
      
      toast.success(response.meta.cache 
        ? 'Valor FIPE encontrado (cache)' 
        : 'Valor FIPE encontrado!'
      );
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar valor FIPE');
    } finally {
      setLoadingValor(false);
    }
  }, [tipoBem, selectedMarcaId, selectedModeloId, selectedAnoId, onValorFound]);

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

  const isComplete = selectedMarcaId && selectedModeloId && selectedAnoId;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Buscar na Tabela FIPE</Label>
        {valorEncontrado && (
          <div className="flex items-center gap-2">
            {cacheInfo?.cache && (
              <div className="flex items-center gap-1 text-blue-600 text-xs">
                <Database className="w-3 h-3" />
                cache
              </div>
            )}
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              FIPE encontrada
            </div>
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
            disabled={disabled || loadingMarcas}
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
          <Label className="text-xs text-muted-foreground">Modelo</Label>
          <Select
            value={selectedModeloId}
            onValueChange={handleModeloChange}
            disabled={disabled || !selectedMarcaId || loadingModelos}
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
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select
            value={selectedAnoId}
            onValueChange={handleAnoChange}
            disabled={disabled || !selectedModeloId || loadingAnos}
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
      </div>

      {/* Botão de buscar valor */}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={fetchValor}
        disabled={disabled || !isComplete || loadingValor}
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
              {valorEncontrado.combustivel && (
                <p className="text-xs text-green-600/70 dark:text-green-400/70">
                  Combustível: {valorEncontrado.combustivel}
                </p>
              )}
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
  );
}
