import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Car,
  Calculator,
  FileText,
  CheckCircle2,
  Settings2,
  Search,
} from 'lucide-react';
import type { Cotacao, TipoBem, MetodoValoracao } from '@/types/cotacao';
import { tipoBemLabels, metodoValoracaoLabels, tiposSemFipe } from '@/types/cotacao';
import PlacaLookup, { PlacaStatus, VehicleData } from './PlacaLookup';
import ValorBemInput from './ValorBemInput';
import FipeSelector from './FipeSelector';

// Validação
const cotacaoSchema = z.object({
  tipo_bem: z.enum(['carro', 'moto', 'pickup', 'caminhao', 'utilitario', 'maquina_agricola', 'maquina_industrial', 'carreta', 'implemento_agricola']),
  marca: z.string().min(2, 'Marca obrigatória').max(100),
  modelo: z.string().min(2, 'Modelo obrigatório').max(100),
  ano_fabricacao: z.number().min(1900).max(new Date().getFullYear() + 1),
  valor_bem: z.number().min(1000, 'Valor mínimo R$ 1.000'),
});

interface CotacaoFormProps {
  leadId?: string;
  leadNome?: string;
  onSuccess: (cotacao: Cotacao) => void;
  onCancel: () => void;
}

export default function CotacaoForm({ leadId, leadNome, onSuccess, onCancel }: CotacaoFormProps) {
  const { user, profile } = useAuth();
  const { cotas, isLoading: cotasLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });
  
  const [formData, setFormData] = useState({
    tipo_bem: '' as TipoBem | '',
    placa: '',
    chassi: '',
    marca: '',
    modelo: '',
    ano_fabricacao: '',
    ano_modelo: '',
    categoria: '',
    cor: '',
    renavam: '',
    metodo_valoracao: 'fipe' as MetodoValoracao,
    valor_bem: '',
    codigo_fipe: '',
    carro_reserva_extra: 'nenhum',
    observacoes: '',
  });
  
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [fipeBloqueado, setFipeBloqueado] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<{
    cota: any;
    mensalidade: number;
    participacao: number;
  } | null>(null);
  
  // Estado para prévia da mensalidade (cálculo automático)
  const [previewMensalidade, setPreviewMensalidade] = useState<{
    cota: any;
    mensalidade: number;
    participacao: number;
  } | null>(null);

  // Cotas ativas
  const cotasAtivas = useMemo(() => cotas.filter(c => c.ativo), [cotas]);

  // Verificar se tipo precisa de FIPE ou permite manual
  const tipoTemFipe = useMemo(() => {
    if (!formData.tipo_bem) return true;
    return !tiposSemFipe.includes(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  // Quando tipo muda para máquina, força método manual
  useEffect(() => {
    if (!tipoTemFipe && formData.tipo_bem) {
      setFormData(prev => ({
        ...prev,
        metodo_valoracao: 'venal',
      }));
      setFipeBloqueado(false);
    }
  }, [formData.tipo_bem, tipoTemFipe]);

  // Função auxiliar para calcular mensalidade
  const calcularMensalidadeAutomatica = useCallback(() => {
    if (!formData.tipo_bem || !formData.valor_bem) {
      setPreviewMensalidade(null);
      return;
    }

    const valorBem = parseValorBem(formData.valor_bem);
    if (valorBem < 1000) {
      setPreviewMensalidade(null);
      return;
    }

    // Encontrar cota baseada no valor
    const cotaEncontrada = cotasAtivas.find(
      (cota) => valorBem >= cota.fipe_min && valorBem <= cota.fipe_max
    );

    if (!cotaEncontrada) {
      setPreviewMensalidade(null);
      return;
    }

    // Buscar mensalidade pelo tipo
    const getMensalidade = (tipo: TipoBem): number => {
      switch (tipo) {
        case 'carro': return Number(cotaEncontrada.mensalidade_carro) || 0;
        case 'moto': return Number(cotaEncontrada.mensalidade_moto) || 0;
        case 'pickup': return Number(cotaEncontrada.mensalidade_pickup) || 0;
        case 'caminhao': return Number((cotaEncontrada as any).mensalidade_caminhao) || Number(cotaEncontrada.mensalidade_pickup) * 1.3;
        case 'utilitario': return Number((cotaEncontrada as any).mensalidade_utilitario) || Number(cotaEncontrada.mensalidade_pickup) * 1.1;
        case 'maquina_agricola': return Number((cotaEncontrada as any).mensalidade_maquina_agricola) || Number(cotaEncontrada.mensalidade_pickup) * 1.5;
        case 'maquina_industrial': return Number((cotaEncontrada as any).mensalidade_maquina_industrial) || Number(cotaEncontrada.mensalidade_pickup) * 1.5;
        case 'carreta': return Number((cotaEncontrada as any).mensalidade_carreta) || Number(cotaEncontrada.mensalidade_pickup) * 1.2;
        case 'implemento_agricola': return Number((cotaEncontrada as any).mensalidade_implemento_agricola) || Number(cotaEncontrada.mensalidade_pickup) * 1.3;
        default: return Number(cotaEncontrada.mensalidade_pickup) || 0;
      }
    };

    let mensalidade = getMensalidade(formData.tipo_bem as TipoBem);

    // Aplicar percentual geral da cota
    const percentualGeral = Number((cotaEncontrada as any).percentual_geral) || 0;
    if (percentualGeral > 0) {
      mensalidade = mensalidade * (1 + percentualGeral / 100);
    }

    // Aplicar percentual extra da cota
    const percentualExtra = Number((cotaEncontrada as any).percentual_extra) || 0;
    if (percentualExtra > 0) {
      mensalidade = mensalidade * (1 + percentualExtra / 100);
    }

    // Adicionar carro reserva extra
    if (formData.carro_reserva_extra === '30dias') {
      mensalidade += 39.90;
    } else if (formData.carro_reserva_extra === '90dias') {
      mensalidade += 59.90;
    }

    // Participação (7% do valor)
    const participacao = valorBem * 0.07;

    setPreviewMensalidade({
      cota: cotaEncontrada,
      mensalidade,
      participacao,
    });
  }, [formData.tipo_bem, formData.valor_bem, formData.carro_reserva_extra, cotasAtivas]);

  // Atualizar prévia da mensalidade automaticamente
  useEffect(() => {
    calcularMensalidadeAutomatica();
  }, [calcularMensalidadeAutomatica]);

  // Handler quando veículo é encontrado via placa
  const handleVehicleFound = useCallback((data: VehicleData) => {
    setFormData(prev => ({
      ...prev,
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
    }));
    
    if (data.fipeEncontrado && data.valor_fipe) {
      setFipeBloqueado(true);
    }
  }, []);

  const handlePlacaStatusChange = useCallback((status: PlacaStatus) => {
    setPlacaStatus(status);
    
    // Se não encontrou ou é inválido, desbloqueia edição
    if (status === 'not_found' || status === 'invalid' || status === 'found_no_fipe') {
      setFipeBloqueado(false);
    }
  }, []);

  // Handler quando valor FIPE é encontrado via seletor em cascata
  const handleFipeValorFound = useCallback((data: {
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
  }) => {
    setFormData(prev => ({
      ...prev,
      marca: data.marca,
      modelo: data.modelo,
      ano_fabricacao: String(data.anoModelo),
      ano_modelo: String(data.anoModelo),
      codigo_fipe: data.codigoFipe,
      valor_bem: String(data.valorFipe),
      metodo_valoracao: 'fipe' as MetodoValoracao,
    }));
    setFipeBloqueado(true);
    
    // Log para auditoria (dados já são registrados no backend)
    console.log('[FIPE] Valor encontrado:', {
      ...data,
      cacheHit: data.cacheHit,
      consultadoEm: data.consultadoEm,
    });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseValorBem = (valor: string): number => {
    // Trata tanto formato brasileiro (1.234,56) quanto americano (1234.56)
    const cleaned = valor.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleCalcular = async () => {
    // Limpar erros anteriores
    setErrors({});

    // Validar campos obrigatórios
    const newErrors: Record<string, string> = {};
    
    if (!formData.tipo_bem) {
      newErrors.tipo_bem = 'Selecione o tipo do bem';
    }
    if (!formData.marca || formData.marca.length < 2) {
      newErrors.marca = 'Informe a marca';
    }
    if (!formData.modelo || formData.modelo.length < 2) {
      newErrors.modelo = 'Informe o modelo';
    }
    if (!formData.ano_fabricacao) {
      newErrors.ano_fabricacao = 'Informe o ano';
    }
    if (!formData.valor_bem) {
      newErrors.valor_bem = 'Informe o valor do bem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsCalculating(true);
    const valorBem = parseValorBem(formData.valor_bem);

    if (valorBem < 1000) {
      setErrors({ valor_bem: 'Valor mínimo R$ 1.000,00' });
      setIsCalculating(false);
      return;
    }

    // Encontrar cota baseada no valor
    const cotaEncontrada = cotasAtivas.find(
      (cota) => valorBem >= cota.fipe_min && valorBem <= cota.fipe_max
    );

    if (!cotaEncontrada) {
      toast.error('Não há faixa configurada para este valor. Entre em contato com o administrador.');
      setIsCalculating(false);
      return;
    }

    // Buscar mensalidade pelo tipo
    const getMensalidade = (tipo: TipoBem): number => {
      switch (tipo) {
        case 'carro': return Number(cotaEncontrada.mensalidade_carro) || 0;
        case 'moto': return Number(cotaEncontrada.mensalidade_moto) || 0;
        case 'pickup': return Number(cotaEncontrada.mensalidade_pickup) || 0;
        case 'caminhao': return Number((cotaEncontrada as any).mensalidade_caminhao) || Number(cotaEncontrada.mensalidade_pickup) * 1.3;
        case 'utilitario': return Number((cotaEncontrada as any).mensalidade_utilitario) || Number(cotaEncontrada.mensalidade_pickup) * 1.1;
        case 'maquina_agricola': return Number((cotaEncontrada as any).mensalidade_maquina_agricola) || Number(cotaEncontrada.mensalidade_pickup) * 1.5;
        case 'maquina_industrial': return Number((cotaEncontrada as any).mensalidade_maquina_industrial) || Number(cotaEncontrada.mensalidade_pickup) * 1.5;
        case 'carreta': return Number((cotaEncontrada as any).mensalidade_carreta) || Number(cotaEncontrada.mensalidade_pickup) * 1.2;
        case 'implemento_agricola': return Number((cotaEncontrada as any).mensalidade_implemento_agricola) || Number(cotaEncontrada.mensalidade_pickup) * 1.3;
        default: return Number(cotaEncontrada.mensalidade_pickup) || 0;
      }
    };

    let mensalidade = getMensalidade(formData.tipo_bem as TipoBem);

    // Aplicar percentual geral da cota
    const percentualGeral = Number((cotaEncontrada as any).percentual_geral) || 0;
    if (percentualGeral > 0) {
      mensalidade = mensalidade * (1 + percentualGeral / 100);
    }

    // Aplicar percentual extra da cota
    const percentualExtra = Number((cotaEncontrada as any).percentual_extra) || 0;
    if (percentualExtra > 0) {
      mensalidade = mensalidade * (1 + percentualExtra / 100);
    }

    // Adicionar carro reserva extra
    if (formData.carro_reserva_extra === '30dias') {
      mensalidade += 39.90;
    } else if (formData.carro_reserva_extra === '90dias') {
      mensalidade += 59.90;
    }

    // Participação (7% do valor)
    const participacao = valorBem * 0.07;

    setResultado({
      cota: cotaEncontrada,
      mensalidade,
      participacao,
    });

    setIsCalculating(false);
  };

  const handleSalvar = async () => {
    if (!resultado) {
      toast.error('Calcule a cotação primeiro');
      return;
    }
    
    // Validar que tem mensalidade calculada
    if (!resultado.mensalidade || resultado.mensalidade <= 0) {
      toast.error('Não é possível salvar cotação sem mensalidade calculada');
      return;
    }

    try {
      const valorBem = parseValorBem(formData.valor_bem);
      
      // Validar
      const parsed = cotacaoSchema.safeParse({
        tipo_bem: formData.tipo_bem,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        valor_bem: valorBem,
      });

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Corrija os erros do formulário');
        return;
      }

      // Preparar dados
      const cotacaoData: Partial<Cotacao> = {
        lead_id: leadId,
        tipo_bem: formData.tipo_bem as TipoBem,
        placa: formData.placa || undefined,
        chassi: formData.chassi || undefined,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : undefined,
        categoria: formData.categoria || undefined,
        cor: formData.cor || undefined,
        renavam: formData.renavam || undefined,
        metodo_valoracao: formData.metodo_valoracao,
        valor_bem: valorBem,
        valor_fipe: fipeBloqueado ? valorBem : undefined,
        codigo_fipe: formData.codigo_fipe || undefined,
        usuario_informou_valor: !fipeBloqueado ? user?.id : undefined,
        data_valor_informado: !fipeBloqueado ? new Date().toISOString() : undefined,
        cota_id: resultado.cota.id,
        mensalidade: resultado.mensalidade,
        participacao: resultado.participacao,
        carro_reserva_dias: formData.carro_reserva_extra === 'nenhum' ? 15 : 
                           formData.carro_reserva_extra === '30dias' ? 45 : 105,
        carro_reserva_adicional: formData.carro_reserva_extra === 'nenhum' ? 0 : 
                                 formData.carro_reserva_extra === '30dias' ? 39.90 : 59.90,
        observacoes: formData.observacoes || undefined,
        regiao_id: profile?.regiao_id,
      };

      // Importar supabase
      const { supabase } = await import('@/integrations/supabase/client');
      
      const insertData = {
        tipo_bem: cotacaoData.tipo_bem!,
        marca: cotacaoData.marca!,
        modelo: cotacaoData.modelo!,
        ano_fabricacao: cotacaoData.ano_fabricacao!,
        valor_bem: cotacaoData.valor_bem!,
        metodo_valoracao: cotacaoData.metodo_valoracao!,
        consultor_id: user?.id!,
        regiao_id: cotacaoData.regiao_id || null,
        lead_id: cotacaoData.lead_id || null,
        placa: cotacaoData.placa || null,
        chassi: cotacaoData.chassi || null,
        ano_modelo: cotacaoData.ano_modelo || null,
        categoria: cotacaoData.categoria || null,
        cor: cotacaoData.cor || null,
        renavam: cotacaoData.renavam || null,
        valor_fipe: cotacaoData.valor_fipe || null,
        codigo_fipe: cotacaoData.codigo_fipe || null,
        usuario_informou_valor: cotacaoData.usuario_informou_valor || null,
        data_valor_informado: cotacaoData.data_valor_informado || null,
        cota_id: cotacaoData.cota_id || null,
        mensalidade: cotacaoData.mensalidade || null,
        participacao: cotacaoData.participacao || null,
        carro_reserva_dias: cotacaoData.carro_reserva_dias ?? 15,
        carro_reserva_adicional: cotacaoData.carro_reserva_adicional ?? 0,
        observacoes: cotacaoData.observacoes || null,
      };
      
      const { data: novaCotacao, error } = await supabase
        .from('cotacoes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Cotação criada com sucesso!');
      onSuccess(novaCotacao as Cotacao);
    } catch (error: any) {
      console.error('Erro ao salvar cotação:', error);
      toast.error(error.message || 'Erro ao salvar cotação');
    }
  };

  // Verifica se pode calcular
  const canCalculate = formData.tipo_bem && formData.marca && formData.modelo && 
                       formData.ano_fabricacao && formData.valor_bem;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nova Cotação</h2>
          {leadNome && (
            <p className="text-muted-foreground">Lead: {leadNome}</p>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          <Calculator className="w-4 h-4 mr-1" />
          Simulador
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <div className="space-y-6">
          {/* ETAPA 1: Tipo do Bem */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5" />
                1. Tipo do Bem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.tipo_bem}
                onValueChange={(value) => {
                  setFormData({ ...formData, tipo_bem: value as TipoBem });
                  setResultado(null);
                }}
              >
                <SelectTrigger className={errors.tipo_bem ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o tipo do veículo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoBemLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo_bem && <p className="text-sm text-destructive mt-1">{errors.tipo_bem}</p>}
            </CardContent>
          </Card>

          {/* ETAPA 2: Placa (Campo Principal) */}
          {formData.tipo_bem && (
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
              <CardContent>
                <PlacaLookup
                  value={formData.placa}
                  onChange={(value) => setFormData({ ...formData, placa: value })}
                  onVehicleFound={handleVehicleFound}
                  onStatusChange={handlePlacaStatusChange}
                  tipoTemFipe={tipoTemFipe}
                />
              </CardContent>
            </Card>
          )}

          {/* ETAPA 3: Dados do Veículo */}
          {formData.tipo_bem && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings2 className="w-5 h-5" />
                  3. Dados do Veículo
                </CardTitle>
                <CardDescription>
                  {placaStatus === 'found_fipe' 
                    ? 'Dados preenchidos automaticamente' 
                    : fipeBloqueado
                    ? 'Dados preenchidos via FIPE'
                    : 'Preencha manualmente ou busque na tabela FIPE'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Busca FIPE em cascata - mostrar quando placa não encontrou */}
                {tipoTemFipe && !fipeBloqueado && (placaStatus === 'not_found' || placaStatus === 'idle') && (
                  <FipeSelector
                    tipoBem={formData.tipo_bem as TipoBem}
                    onValorFound={handleFipeValorFound}
                    disabled={fipeBloqueado}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input
                      placeholder="Ex: Volkswagen"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      disabled={fipeBloqueado}
                      className={errors.marca ? 'border-destructive' : ''}
                    />
                    {errors.marca && <p className="text-xs text-destructive">{errors.marca}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo *</Label>
                    <Input
                      placeholder="Ex: Gol"
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      disabled={fipeBloqueado}
                      className={errors.modelo ? 'border-destructive' : ''}
                    />
                    {errors.modelo && <p className="text-xs text-destructive">{errors.modelo}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ano Fabricação *</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2020"
                      value={formData.ano_fabricacao}
                      onChange={(e) => setFormData({ ...formData, ano_fabricacao: e.target.value })}
                      disabled={fipeBloqueado}
                      className={errors.ano_fabricacao ? 'border-destructive' : ''}
                    />
                    {errors.ano_fabricacao && <p className="text-xs text-destructive">{errors.ano_fabricacao}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Modelo</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2021"
                      value={formData.ano_modelo}
                      onChange={(e) => setFormData({ ...formData, ano_modelo: e.target.value })}
                      disabled={fipeBloqueado}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chassi</Label>
                    <Input
                      placeholder="Número do chassi"
                      value={formData.chassi}
                      onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <Input
                      placeholder="Número do Renavam"
                      value={formData.renavam}
                      onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input
                      placeholder="Ex: Prata"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria/Complemento</Label>
                    <Input
                      placeholder="Ex: Sedan, SUV..."
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ETAPA 4: Valoração */}
          {formData.tipo_bem && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
                  Valoração do Bem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ValorBemInput
                  valorBem={formData.valor_bem}
                  onValorChange={(value) => {
                    setFormData({ ...formData, valor_bem: value });
                    setResultado(null);
                  }}
                  metodoValoracao={formData.metodo_valoracao}
                  onMetodoChange={(value) => setFormData({ ...formData, metodo_valoracao: value })}
                  codigoFipe={formData.codigo_fipe}
                  onCodigoFipeChange={(value) => setFormData({ ...formData, codigo_fipe: value })}
                  fipeBloqueado={fipeBloqueado}
                  tipoTemFipe={tipoTemFipe}
                  error={errors.valor_bem}
                />

                <Separator />

                <div className="space-y-2">
                  <Label>Carro Reserva</Label>
                  <Select
                    value={formData.carro_reserva_extra}
                    onValueChange={(value) => {
                      setFormData({ ...formData, carro_reserva_extra: value });
                      setResultado(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">15 dias (inclusos)</SelectItem>
                      <SelectItem value="30dias">+30 dias (R$ 39,90/mês)</SelectItem>
                      <SelectItem value="90dias">+90 dias (R$ 59,90/mês)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Anotações sobre a cotação..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleCalcular} 
                  className="w-full" 
                  size="lg"
                  disabled={isCalculating || cotasLoading || !canCalculate}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {isCalculating ? 'Calculando...' : 'Calcular Cotação'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resultado */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {resultado ? (
            <Card className="border-primary">
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Resultado da Cotação
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  {formData.marca} {formData.modelo} {formData.ano_fabricacao}
                  {formData.placa && ` • ${formData.placa}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mensalidade</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(resultado.mensalidade)}
                  </p>
                  <Badge className="mt-2">{resultado.cota.nome}</Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Bem</p>
                    <p className="font-semibold">{formatCurrency(parseValorBem(formData.valor_bem))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participação (7%)</p>
                    <p className="font-semibold">{formatCurrency(resultado.participacao)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{tipoBemLabels[formData.tipo_bem as TipoBem]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <Badge variant={fipeBloqueado ? "default" : "secondary"} className="gap-1">
                      {fipeBloqueado && <CheckCircle2 className="w-3 h-3" />}
                      {metodoValoracaoLabels[formData.metodo_valoracao]}
                    </Badge>
                  </div>
                  {formData.placa && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Placa:</span>
                      <span className="font-mono">{formData.placa}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carro Reserva:</span>
                    <span>
                      {formData.carro_reserva_extra === 'nenhum' ? '15 dias' :
                       formData.carro_reserva_extra === '30dias' ? '45 dias' : '105 dias'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSalvar} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Salvar Cotação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : previewMensalidade ? (
            <Card className="border-dashed border-2 border-primary/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5 text-primary" />
                  Prévia da Mensalidade
                </CardTitle>
                <CardDescription>
                  Valor calculado automaticamente • Confirme para salvar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mensalidade Estimada</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(previewMensalidade.mensalidade)}
                  </p>
                  <Badge variant="outline" className="mt-2">{previewMensalidade.cota.nome}</Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor FIPE</p>
                    <p className="font-medium">{formatCurrency(parseValorBem(formData.valor_bem))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Participação (7%)</p>
                    <p className="font-medium">{formatCurrency(previewMensalidade.participacao)}</p>
                  </div>
                </div>

                {formData.carro_reserva_extra !== 'nenhum' && (
                  <div className="text-center text-xs text-muted-foreground">
                    Inclui carro reserva adicional: {formData.carro_reserva_extra === '30dias' ? '+30 dias' : '+90 dias'}
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    onClick={handleCalcular} 
                    className="w-full" 
                    size="lg"
                    disabled={isCalculating || cotasLoading || !canCalculate}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isCalculating ? 'Calculando...' : 'Confirmar e Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aguardando dados</p>
                <p className="text-sm mt-1">
                  {!formData.tipo_bem 
                    ? 'Selecione o tipo do bem para começar'
                    : 'Preencha os dados do veículo e valor FIPE'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
