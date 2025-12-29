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
import { Slider } from '@/components/ui/slider';
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
  AlertTriangle,
  Lock,
  Percent,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Cotacao, TipoBem, MetodoValoracao } from '@/types/cotacao';
import { tipoBemLabels, metodoValoracaoLabels, tiposSemFipe } from '@/types/cotacao';
import PlacaLookup, { PlacaStatus, VehicleData } from './PlacaLookup';
import ValorBemInput from './ValorBemInput';
import FipeSelector from './FipeSelector';
import {
  calcularCotacaoCompleta,
  getCategoriaByTipoVeiculo,
  getPerfilEditor,
  validarAjustePercentual,
  formatCurrency,
  parseValorBrasileiro,
  categoriaLabels,
  type CotaCategoria,
  type PerfilEditor,
  type ResultadoCotacao,
  type Cota,
} from '@/lib/cotacaoUtils';

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
  const { user, profile, roles, isAdminPrincipal } = useAuth();
  const { cotas, isLoading: cotasLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });
  
  // Determinar perfil do editor
  const perfilEditor = useMemo(() => {
    return getPerfilEditor(roles || [], isAdminPrincipal);
  }, [roles, isAdminPrincipal]);

  const [formData, setFormData] = useState({
    tipo_bem: '' as TipoBem | '',
    placa: '',
    chassi: '',
    marca: '',
    modelo: '',
    ano_fabricacao: '',
    ano_modelo: '',
    cor: '',
    renavam: '',
    metodo_valoracao: 'fipe' as MetodoValoracao,
    valor_bem: '',
    codigo_fipe: '',
    carro_reserva_extra: 'nenhum' as 'nenhum' | '30dias' | '90dias',
    observacoes: '',
    percentual_individual: 0, // Ajuste do gestor
    motivo_ajuste: '',
  });
  
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [fipeBloqueado, setFipeBloqueado] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);
  
  // Estado para prévia automática
  const [previewResult, setPreviewResult] = useState<ResultadoCotacao | null>(null);

  // Cotas ativas
  const cotasAtivas = useMemo(() => (cotas as Cota[]).filter(c => c.ativo), [cotas]);

  // Categoria calculada automaticamente
  const categoriaCalculada = useMemo((): CotaCategoria | null => {
    if (!formData.tipo_bem) return null;
    return getCategoriaByTipoVeiculo(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  // Verificar se tipo precisa de FIPE ou permite manual
  const tipoTemFipe = useMemo(() => {
    if (!formData.tipo_bem) return true;
    return !tiposSemFipe.includes(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  // Verificar se pode editar percentual
  const podeEditarPercentual = useMemo(() => {
    return perfilEditor === 'ADMIN' || perfilEditor === 'GESTOR';
  }, [perfilEditor]);

  // Limites do slider baseado no perfil
  const limitePercentual = useMemo(() => {
    if (perfilEditor === 'ADMIN') {
      return { min: -50, max: 50 };
    }
    return { min: -15, max: 15 };
  }, [perfilEditor]);

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

  // Cálculo automático da prévia
  const calcularPreviaAutomatica = useCallback(() => {
    if (!formData.tipo_bem || !formData.valor_bem) {
      setPreviewResult(null);
      return;
    }

    const valorBem = parseValorBrasileiro(formData.valor_bem);
    if (valorBem < 1000) {
      setPreviewResult(null);
      return;
    }

    const result = calcularCotacaoCompleta(
      valorBem,
      formData.tipo_bem as TipoBem,
      cotasAtivas,
      formData.percentual_individual,
      formData.carro_reserva_extra
    );

    setPreviewResult(result);
  }, [formData.tipo_bem, formData.valor_bem, formData.percentual_individual, formData.carro_reserva_extra, cotasAtivas]);

  // Atualizar prévia automaticamente
  useEffect(() => {
    calcularPreviaAutomatica();
  }, [calcularPreviaAutomatica]);

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
    if (status === 'not_found' || status === 'invalid' || status === 'found_no_fipe') {
      setFipeBloqueado(false);
    }
  }, []);

  // Handler quando valor FIPE é encontrado via seletor
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
  }, []);

  // Handler para ajuste de percentual
  const handlePercentualChange = useCallback((value: number[]) => {
    const novoPercentual = value[0];
    
    // Validar permissão
    const validacao = validarAjustePercentual(perfilEditor, novoPercentual);
    
    if (!validacao.permitido) {
      toast.error(validacao.mensagem || 'Sem permissão para este ajuste');
      return;
    }

    setFormData(prev => ({
      ...prev,
      percentual_individual: novoPercentual
    }));
    setResultado(null);
  }, [perfilEditor]);

  const handleCalcular = async () => {
    setErrors({});

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
    const valorBem = parseValorBrasileiro(formData.valor_bem);

    if (valorBem < 1000) {
      setErrors({ valor_bem: 'Valor mínimo R$ 1.000,00' });
      setIsCalculating(false);
      return;
    }

    // Validar ajuste de percentual
    if (formData.percentual_individual !== 0) {
      const validacao = validarAjustePercentual(perfilEditor, formData.percentual_individual);
      if (!validacao.permitido) {
        toast.error(validacao.mensagem || 'Ajuste não permitido');
        setIsCalculating(false);
        return;
      }
    }

    const result = calcularCotacaoCompleta(
      valorBem,
      formData.tipo_bem as TipoBem,
      cotasAtivas,
      formData.percentual_individual,
      formData.carro_reserva_extra
    );

    if (!result) {
      toast.error('Não há faixa configurada para este valor. Entre em contato com o administrador.');
      setIsCalculating(false);
      return;
    }

    setResultado(result);
    setIsCalculating(false);
  };

  const handleSalvar = async () => {
    if (!resultado) {
      toast.error('Calcule a cotação primeiro');
      return;
    }
    
    if (!resultado.valorFinal || resultado.valorFinal <= 0) {
      toast.error('Não é possível salvar cotação sem mensalidade calculada');
      return;
    }

    try {
      const valorBem = parseValorBrasileiro(formData.valor_bem);
      
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

      const { supabase } = await import('@/integrations/supabase/client');
      
      const insertData = {
        tipo_bem: formData.tipo_bem as TipoBem,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        valor_bem: valorBem,
        metodo_valoracao: formData.metodo_valoracao!,
        consultor_id: user?.id!,
        regiao_id: profile?.regiao_id || null,
        lead_id: leadId || null,
        placa: formData.placa || null,
        chassi: formData.chassi || null,
        ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : null,
        categoria: resultado.categoria, // CATEGORIA OBRIGATÓRIA
        cor: formData.cor || null,
        renavam: formData.renavam || null,
        valor_fipe: fipeBloqueado ? valorBem : null,
        codigo_fipe: formData.codigo_fipe || null,
        usuario_informou_valor: !fipeBloqueado ? user?.id : null,
        data_valor_informado: !fipeBloqueado ? new Date().toISOString() : null,
        cota_id: resultado.cotaId,
        // Campos de cálculo
        valor_base: resultado.valorBase,
        percentual_global: resultado.percentualGlobal,
        percentual_individual: resultado.percentualIndividual,
        valor_final: resultado.valorFinal,
        mensalidade: resultado.valorFinal,
        participacao: resultado.participacao,
        // Rastreamento de edição
        editado_por: formData.percentual_individual !== 0 ? user?.id : null,
        perfil_editor: formData.percentual_individual !== 0 ? perfilEditor : null,
        motivo_ajuste: formData.motivo_ajuste || null,
        // Carro reserva
        carro_reserva_dias: formData.carro_reserva_extra === 'nenhum' ? 15 : 
                           formData.carro_reserva_extra === '30dias' ? 45 : 105,
        carro_reserva_adicional: formData.carro_reserva_extra === 'nenhum' ? 0 : 
                                 formData.carro_reserva_extra === '30dias' ? 39.90 : 59.90,
        observacoes: formData.observacoes || null,
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
        <div className="flex items-center gap-2">
          <Badge variant={perfilEditor === 'ADMIN' ? 'default' : perfilEditor === 'GESTOR' ? 'secondary' : 'outline'}>
            {perfilEditor}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Calculator className="w-4 h-4 mr-1" />
            Simulador
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <div className="space-y-6">
          {/* ETAPA 1: Tipo do Bem (determina categoria automaticamente) */}
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
              <Select
                value={formData.tipo_bem}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, tipo_bem: value as TipoBem, percentual_individual: 0 }));
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

              {/* Exibir categoria calculada */}
              {categoriaCalculada && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <Badge variant="secondary" className="text-sm">
                    Categoria: {categoriaLabels[categoriaCalculada]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    (definida automaticamente)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ETAPA 2: Placa */}
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
                  onChange={(value) => setFormData(prev => ({ ...prev, placa: value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, ano_fabricacao: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, ano_modelo: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, chassi: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <Input
                      placeholder="Número do Renavam"
                      value={formData.renavam}
                      onChange={(e) => setFormData(prev => ({ ...prev, renavam: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    placeholder="Ex: Prata"
                    value={formData.cor}
                    onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ETAPA 4: Valoração e Ajustes */}
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
                    setFormData(prev => ({ ...prev, valor_bem: value }));
                    setResultado(null);
                  }}
                  metodoValoracao={formData.metodo_valoracao}
                  onMetodoChange={(value) => setFormData(prev => ({ ...prev, metodo_valoracao: value }))}
                  codigoFipe={formData.codigo_fipe}
                  onCodigoFipeChange={(value) => setFormData(prev => ({ ...prev, codigo_fipe: value }))}
                  fipeBloqueado={fipeBloqueado}
                  tipoTemFipe={tipoTemFipe}
                  error={errors.valor_bem}
                />

                <Separator />

                {/* Ajuste de Percentual - Visível apenas para ADMIN e GESTOR */}
                {podeEditarPercentual && previewResult && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Ajuste Individual
                      </Label>
                      <div className="flex items-center gap-2">
                        {formData.percentual_individual !== 0 && (
                          formData.percentual_individual > 0 ? (
                            <TrendingUp className="w-4 h-4 text-destructive" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )
                        )}
                        <Badge variant={formData.percentual_individual === 0 ? 'secondary' : 'default'}>
                          {formData.percentual_individual > 0 ? '+' : ''}{formData.percentual_individual}%
                        </Badge>
                      </div>
                    </div>
                    
                    <Slider
                      value={[formData.percentual_individual]}
                      onValueChange={handlePercentualChange}
                      min={limitePercentual.min}
                      max={limitePercentual.max}
                      step={1}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{limitePercentual.min}%</span>
                      <span>0%</span>
                      <span>+{limitePercentual.max}%</span>
                    </div>

                    {perfilEditor === 'GESTOR' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Gestor: limite de ±15%. Para ajustes maiores, solicite ao Administrador.</span>
                      </div>
                    )}

                    {formData.percentual_individual !== 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Motivo do Ajuste</Label>
                        <Textarea
                          placeholder="Descreva o motivo do ajuste..."
                          value={formData.motivo_ajuste}
                          onChange={(e) => setFormData(prev => ({ ...prev, motivo_ajuste: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Consultor: Mensagem de só leitura */}
                {perfilEditor === 'CONSULTOR' && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Valores calculados automaticamente. Ajustes requerem perfil de Gestor ou Admin.</span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Carro Reserva</Label>
                  <Select
                    value={formData.carro_reserva_extra}
                    onValueChange={(value: 'nenhum' | '30dias' | '90dias') => {
                      setFormData(prev => ({ ...prev, carro_reserva_extra: value }));
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
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
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

        {/* Resultado / Preview */}
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
                    {formatCurrency(resultado.valorFinal)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge>{resultado.cotaNome}</Badge>
                    <Badge variant="secondary">{categoriaLabels[resultado.categoria]}</Badge>
                  </div>
                </div>

                <Separator />

                {/* Detalhes do Cálculo */}
                <div className="space-y-3 text-sm">
                  <div className="font-semibold text-muted-foreground uppercase text-xs">Detalhes do Cálculo</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Base:</span>
                    <span className="font-medium">{formatCurrency(resultado.valorBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% Global:</span>
                    <span className="font-medium">{resultado.percentualGlobal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% Ajuste:</span>
                    <span className={`font-medium ${resultado.percentualIndividual !== 0 ? 'text-primary' : ''}`}>
                      {resultado.percentualIndividual > 0 ? '+' : ''}{resultado.percentualIndividual}%
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Valor Final:</span>
                    <span className="text-primary">{formatCurrency(resultado.valorFinal)}</span>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Bem</p>
                    <p className="font-semibold">{formatCurrency(parseValorBrasileiro(formData.valor_bem))}</p>
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
          ) : previewResult ? (
            <Card className="border-dashed border-2 border-primary/50">
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-xl font-bold uppercase tracking-wide">
                  Proposta de Cotação
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Proteção Veicular • Máquinas • Caminhões • Motos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mensalidade Estimada</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(previewResult.valorFinal)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline">{previewResult.cotaNome}</Badge>
                    <Badge variant="secondary">{categoriaLabels[previewResult.categoria]}</Badge>
                  </div>
                </div>

                <Separator />

                {/* Prévia do cálculo */}
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Base:</span>
                    <span>{formatCurrency(previewResult.valorBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% Global:</span>
                    <span>{previewResult.percentualGlobal}%</span>
                  </div>
                  {previewResult.percentualIndividual !== 0 && (
                    <div className="flex justify-between text-primary">
                      <span>% Ajuste:</span>
                      <span>{previewResult.percentualIndividual > 0 ? '+' : ''}{previewResult.percentualIndividual}%</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor FIPE</p>
                    <p className="font-medium">{formatCurrency(parseValorBrasileiro(formData.valor_bem))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Participação (7%)</p>
                    <p className="font-medium">{formatCurrency(previewResult.participacao)}</p>
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
