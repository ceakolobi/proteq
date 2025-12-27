import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TipoBem } from '@/types/cotacao';

interface FipeMarca {
  codigo: string;
  nome: string;
}

interface FipeModelo {
  codigo: number;
  nome: string;
}

interface FipeAno {
  codigo: string;
  nome: string;
}

interface FipeValor {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  TipoVeiculo: number;
  SiglaCombustivel: string;
}

interface FipeSelectorProps {
  tipoBem: TipoBem;
  onValorFound: (data: {
    marca: string;
    modelo: string;
    anoModelo: number;
    valorFipe: number;
    codigoFipe: string;
  }) => void;
  disabled?: boolean;
  initialMarca?: string;
  initialModelo?: string;
}

export default function FipeSelector({
  tipoBem,
  onValorFound,
  disabled = false,
  initialMarca,
  initialModelo,
}: FipeSelectorProps) {
  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [anos, setAnos] = useState<FipeAno[]>([]);
  
  const [selectedMarcaId, setSelectedMarcaId] = useState<string>('');
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [selectedAnoId, setSelectedAnoId] = useState<string>('');
  
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);
  const [loadingValor, setLoadingValor] = useState(false);
  
  const [valorEncontrado, setValorEncontrado] = useState<FipeValor | null>(null);

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

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fipe/marcas?tipo=${tipoBem}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar marcas');
      }
      
      const marcasData = await response.json();
      setMarcas(marcasData || []);
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

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fipe/modelos?tipo=${tipoBem}&marcaId=${marcaId}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar modelos');
      }
      
      const modelosData = await response.json();
      setModelos(modelosData || []);
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

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fipe/anos?tipo=${tipoBem}&marcaId=${selectedMarcaId}&modeloId=${modeloId}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar anos');
      }
      
      const anosData = await response.json();
      setAnos(anosData || []);
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

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fipe/valor?tipo=${tipoBem}&marcaId=${selectedMarcaId}&modeloId=${selectedModeloId}&anoId=${selectedAnoId}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar valor');
      }
      
      const valorData: FipeValor = await response.json();
      setValorEncontrado(valorData);
      
      // Converter valor de "R$ 50.000,00" para número
      const valorNumerico = parseFloat(
        valorData.Valor.replace('R$ ', '').replace(/\./g, '').replace(',', '.')
      );
      
      onValorFound({
        marca: valorData.Marca,
        modelo: valorData.Modelo,
        anoModelo: valorData.AnoModelo,
        valorFipe: valorNumerico,
        codigoFipe: valorData.CodigoFipe,
      });
      
      toast.success('Valor FIPE encontrado!');
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      toast.error('Erro ao buscar valor FIPE');
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
            disabled={disabled || loadingMarcas}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingMarcas ? "Carregando..." : "Selecione a marca"} />
            </SelectTrigger>
            <SelectContent>
              {marcas.map((marca) => (
                <SelectItem key={marca.codigo} value={marca.codigo}>
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
                <SelectItem key={modelo.codigo} value={String(modelo.codigo)}>
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
                <SelectItem key={ano.codigo} value={ano.codigo}>
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
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                {valorEncontrado.Marca} {valorEncontrado.Modelo}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Ano: {valorEncontrado.AnoModelo} | Código: {valorEncontrado.CodigoFipe}
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">
                Ref: {valorEncontrado.MesReferencia}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {valorEncontrado.Valor}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
