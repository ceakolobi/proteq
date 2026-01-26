import { useState, useCallback } from 'react';
import { toast } from 'sonner';

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

type TipoBem = 'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario';

/**
 * Hook para busca FIPE pública (sem autenticação obrigatória)
 * Usado na landing page para cotação de visitantes
 */
export function usePublicFipe(tipoBem: TipoBem) {
  const [marcas, setMarcas] = useState<FipeItem[]>([]);
  const [modelos, setModelos] = useState<FipeItem[]>([]);
  const [anos, setAnos] = useState<FipeItem[]>([]);
  
  const [selectedMarcaId, setSelectedMarcaId] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [selectedAnoId, setSelectedAnoId] = useState('');
  
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);
  const [loadingValor, setLoadingValor] = useState(false);
  
  const [valorEncontrado, setValorEncontrado] = useState<FipeValorResult | null>(null);

  // Função para fazer requisições à API FIPE (pública, sem auth obrigatório)
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
    
    const data: FipeApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
    return data;
  };

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
      const response = await fetchFipe('marcas', { tipo: tipoBem });
      setMarcas(response.data as FipeItem[]);
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoadingMarcas(false);
    }
  }, [tipoBem]);

  const fetchModelos = useCallback(async (marcaId: string) => {
    if (!marcaId) return;
    
    setLoadingModelos(true);
    setModelos([]);
    setAnos([]);
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);

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

  const fetchAnos = useCallback(async (modeloId: string) => {
    if (!selectedMarcaId || !modeloId) return;
    
    setLoadingAnos(true);
    setAnos([]);
    setSelectedAnoId('');
    setValorEncontrado(null);

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

  const fetchValor = useCallback(async (): Promise<FipeValorResult | null> => {
    if (!selectedMarcaId || !selectedModeloId || !selectedAnoId) return null;
    
    setLoadingValor(true);
    setValorEncontrado(null);

    try {
      const response = await fetchFipe('valor', {
        tipo: tipoBem,
        marcaId: selectedMarcaId,
        modeloId: selectedModeloId,
        anoId: selectedAnoId,
      });
      
      const valorData = response.data as FipeValorResult;
      setValorEncontrado(valorData);
      return valorData;
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar valor FIPE');
      return null;
    } finally {
      setLoadingValor(false);
    }
  }, [tipoBem, selectedMarcaId, selectedModeloId, selectedAnoId]);

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

  const reset = () => {
    setMarcas([]);
    setModelos([]);
    setAnos([]);
    setSelectedMarcaId('');
    setSelectedModeloId('');
    setSelectedAnoId('');
    setValorEncontrado(null);
  };

  const getMarcaNome = () => marcas.find(m => m.id === selectedMarcaId)?.nome || '';
  const getModeloNome = () => modelos.find(m => m.id === selectedModeloId)?.nome || '';

  return {
    // State
    marcas,
    modelos,
    anos,
    selectedMarcaId,
    selectedModeloId,
    selectedAnoId,
    valorEncontrado,
    
    // Loading states
    loadingMarcas,
    loadingModelos,
    loadingAnos,
    loadingValor,
    isComplete: !!(selectedMarcaId && selectedModeloId && selectedAnoId),
    
    // Actions
    fetchMarcas,
    fetchValor,
    handleMarcaChange,
    handleModeloChange,
    handleAnoChange,
    reset,
    getMarcaNome,
    getModeloNome,
  };
}
