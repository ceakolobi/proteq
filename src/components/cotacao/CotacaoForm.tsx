import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useMensalidadeCalculada } from '@/hooks/useMensalidadeCalculada';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserCheck,
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
  validarAjusteValor,
  formatCurrency,
  parseValorBrasileiro,
  categoriaLabels,
  isCota01,
  PARTICIPACAO_MINIMA_COTA_01,
  TEXTO_COTACAO_COTA_01,
  type CotaCategoria,
  type PerfilEditor,
  type ResultadoCotacao,
} from '@/lib/cotacaoUtils';
import { BeneficiosExtrasSelector } from './BeneficiosExtrasSelector';
import type { BeneficioExtra } from '@/hooks/useBeneficiosExtras';
import { Sparkles } from 'lucide-react';

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

  // Determinar perfil do editor
  const perfilEditor = useMemo(() => {
    return getPerfilEditor(roles || [], isAdminPrincipal);
  }, [roles, isAdminPrincipal]);

  const podeAlterarConsultor = perfilEditor !== 'CONSULTOR';

  const { consultores } = useReferenceData({ loadConsultores: true, loadRegioes: false });
  const [selectedConsultorId, setSelectedConsultorId] = useState('');

  // Pré-seleciona o próprio consultor; admin/gestor começa vazio (força seleção)
  useEffect(() => {
    if (user?.id && perfilEditor === 'CONSULTOR') {
      setSelectedConsultorId(user.id);
    }
  }, [user?.id, perfilEditor]);

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
    carro_reserva_extra: 'nenhum' as 'nenhum' | 'mais15' | 'mais30',
    observacoes: '',
    ajuste_individual_valor: 0, // Ajuste em R$ pelo gestor
    motivo_ajuste: '',
    valor_adesao: 0,
  });
  
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [fipeBloqueado, setFipeBloqueado] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);
  const [percentualParticipacao, setPercentualParticipacao] = useState<7 | 10 | 15>(7);

  // Benefícios extras selecionados
  const [beneficiosSelecionadosIds, setBeneficiosSelecionadosIds] = useState<string[]>([]);
  const [beneficiosSelecionadosObjs, setBeneficiosSelecionadosObjs] = useState<BeneficioExtra[]>([]);
  const valorBeneficiosExtras = useMemo(
    () => beneficiosSelecionadosObjs.reduce((acc, b) => acc + Number(b.valor_mensal || 0), 0),
    [beneficiosSelecionadosObjs]
  );
  
  // Fonte única: cotas ativas + cálculo de mensalidade (compartilhado com o wizard)
  const valorBemNumerico = useMemo(() => parseValorBrasileiro(formData.valor_bem), [formData.valor_bem]);
  const {
    resultado: previewResultRaw,
    cotasAtivas,
    isLoading: cotasLoading,
  } = useMensalidadeCalculada({
    valorFipe: valorBemNumerico,
    tipo: formData.tipo_bem || null,
    ajusteIndividual: formData.ajuste_individual_valor,
    carroReservaExtra: formData.carro_reserva_extra,
  });
  // Preserva o comportamento original: valor < R$ 1.000 não exibe prévia
  const previewResult = valorBemNumerico >= 1000 ? previewResultRaw : null;

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

  // Verificar se pode editar ajuste individual
  const podeEditarAjuste = useMemo(() => {
    return perfilEditor === 'ADMIN' || perfilEditor === 'GESTOR';
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

  // Handler para ajuste de valor individual
  const handleAjusteValorChange = useCallback((valor: number) => {
    // Validar permissão
    const validacao = validarAjusteValor(perfilEditor, 'individual');
    
    if (!validacao.permitido) {
      toast.error(validacao.mensagem || 'Sem permissão para este ajuste');
      return;
    }

    setFormData(prev => ({
      ...prev,
      ajuste_individual_valor: valor
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

    // Validar ajuste de valor
    if (formData.ajuste_individual_valor !== 0) {
      const validacao = validarAjusteValor(perfilEditor, 'individual');
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
      formData.ajuste_individual_valor,
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

  const handleSalvar = async (resultadoParaSalvar?: ResultadoCotacao) => {
    const resultadoFinal = resultadoParaSalvar || resultado;
    if (!resultadoFinal) {
      toast.error('Calcule a cotação primeiro');
      return;
    }

    if (!resultadoFinal.valorFinal || resultadoFinal.valorFinal <= 0) {
      toast.error('Não é possível salvar cotação sem mensalidade calculada');
      return;
    }

    if (!selectedConsultorId) {
      setErrors(prev => ({ ...prev, consultor_id: 'Selecione o consultor responsável' }));
      toast.error('Selecione o consultor responsável');
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
        consultor_id: selectedConsultorId || user?.id!,
        company_id: profile?.company_id || null,
        regiao_id: profile?.regiao_id || null,
        lead_id: leadId || null,
        placa: formData.placa || null,
        chassi: formData.chassi || null,
        ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : null,
        categoria: resultadoFinal.categoria,
        cor: formData.cor || null,
        renavam: formData.renavam || null,
        valor_fipe: fipeBloqueado ? valorBem : null,
        codigo_fipe: formData.codigo_fipe || null,
        usuario_informou_valor: !fipeBloqueado ? user?.id : null,
        data_valor_informado: !fipeBloqueado ? new Date().toISOString() : null,
        cota_id: resultadoFinal.cotaId,
        valor_base: resultadoFinal.valorBase,
        ajuste_geral_valor: resultadoFinal.ajusteGeralValor,
        ajuste_individual_valor: resultadoFinal.ajusteIndividualValor,
        valor_final: resultadoFinal.valorFinal,
        mensalidade: resultadoFinal.valorFinal,
        participacao: valorBem * (percentualParticipacao / 100),
        editado_por: formData.ajuste_individual_valor !== 0 ? user?.id : null,
        perfil_editor: formData.ajuste_individual_valor !== 0 ? perfilEditor : null,
        motivo_ajuste: formData.motivo_ajuste || null,
        carro_reserva_dias: formData.carro_reserva_extra === 'nenhum' ? 15 : 
                           formData.carro_reserva_extra === 'mais15' ? 30 : 45,
        carro_reserva_adicional: formData.carro_reserva_extra === 'nenhum' ? 0 :
                                 formData.carro_reserva_extra === 'mais15' ? 19.90 : 29.90,
        observacoes: formData.observacoes || null,
        valor_adesao: formData.valor_adesao || 0,
      };
      
      const { data: novaCotacao, error } = await supabase
        .from('cotacoes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      if (beneficiosSelecionadosObjs.length > 0 && novaCotacao) {
        const beneficiosPayload = beneficiosSelecionadosObjs.map(b => ({
          cotacao_id: (novaCotacao as any).id,
          beneficio_id: b.id,
          nome_snapshot: b.nome,
          valor_snapshot: Number(b.valor_mensal),
          selecionado_por: 'consultor',
        }));
        const { error: errBen } = await supabase
          .from('cotacao_beneficios')
          .insert(beneficiosPayload);
        if (errBen) {
          console.error('Erro ao salvar benefícios:', errBen);
          toast.warning('Cotação criada, mas houve erro ao salvar benefícios extras.');
        }
      }

      toast.success('Cotação criada com sucesso!');
      onSuccess(novaCotacao as Cotacao);
    } catch (error: any) {
      console.error('Erro ao salvar cotação:', error);
      toast.error(error.message || 'Erro ao salvar cotação');
    }
  };

  // Confirma e salva em um único passo a partir da prévia (igual ao fluxo da landing)
  const handleConfirmarESalvar = async () => {
    if (!selectedConsultorId) {
      toast.error('Selecione o consultor responsável');
      return;
    }
    if (!formData.tipo_bem || !formData.marca || !formData.modelo || !formData.ano_fabricacao || !formData.valor_bem) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const valorBem = parseValorBrasileiro(formData.valor_bem);
    if (valorBem < 1000) {
      setErrors({ valor_bem: 'Valor mínimo R$ 1.000,00' });
      return;
    }
    setIsCalculating(true);
    const result = calcularCotacaoCompleta(
      valorBem,
      formData.tipo_bem as TipoBem,
      cotasAtivas,
      formData.ajuste_individual_valor,
      formData.carro_reserva_extra
    );
    if (!result) {
      toast.error('Não há faixa configurada para este valor.');
      setIsCalculating(false);
      return;
    }
    setResultado(result);
    await handleSalvar(result);
    setIsCalculating(false);
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
          {/* Consultor Responsável */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5" />
                Consultor Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Consultor *</Label>
                <Select
                  value={selectedConsultorId}
                  onValueChange={setSelectedConsultorId}
                  disabled={!podeAlterarConsultor}
                >
                  <SelectTrigger className={(errors as any).consultor_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o consultor responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors as any).consultor_id && (
                  <p className="text-sm text-destructive">{(errors as any).consultor_id}</p>
                )}
              </div>
            </CardContent>
          </Card>

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
                  {placaStatus === 'found_fipe' || fipeBloqueado
                    ? 'Dados preenchidos automaticamente via placa/FIPE'
                    : (placaStatus === 'not_found' || placaStatus === 'error')
                    ? 'Preencha os dados do veículo abaixo ou use a busca FIPE'
                    : 'Preencha manualmente ou busque na tabela FIPE'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tipoTemFipe && !fipeBloqueado && (placaStatus === 'not_found' || placaStatus === 'idle' || placaStatus === 'error') && (
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

                {/* Ajuste de Valor Individual - Visível apenas para ADMIN e GESTOR */}
                {podeEditarAjuste && previewResult && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Ajuste Individual (R$)
                      </Label>
                      <div className="flex items-center gap-2">
                        {formData.ajuste_individual_valor !== 0 && (
                          formData.ajuste_individual_valor > 0 ? (
                            <TrendingUp className="w-4 h-4 text-destructive" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )
                        )}
                        <Badge variant={formData.ajuste_individual_valor === 0 ? 'secondary' : 'default'}>
                          {formData.ajuste_individual_valor > 0 ? '+' : ''}{formatCurrency(formData.ajuste_individual_valor)}
                        </Badge>
                      </div>
                    </div>
                    
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.ajuste_individual_valor || ''}
                      onChange={(e) => handleAjusteValorChange(parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                    
                    <p className="text-xs text-muted-foreground">
                      Valor fixo em R$ somado (positivo) ou subtraído (negativo) da mensalidade.
                    </p>

                    {perfilEditor === 'GESTOR' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Gestor: pode ajustar apenas o valor individual. Ajuste geral requer Administrador.</span>
                      </div>
                    )}

                    {formData.ajuste_individual_valor !== 0 && (
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
                    onValueChange={(value: 'nenhum' | 'mais15' | 'mais30') => {
                      setFormData(prev => ({ ...prev, carro_reserva_extra: value }));
                      setResultado(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">15 dias (inclusos)</SelectItem>
                      <SelectItem value="mais15">+15 dias (R$ 19,90/mês)</SelectItem>
                      <SelectItem value="mais30">+30 dias (R$ 29,90/mês)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold">Benefícios Extras (opcional)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione benefícios adicionais para personalizar o plano. Cada um soma um valor fixo na mensalidade.
                  </p>
                  <BeneficiosExtrasSelector
                    tipoBem={formData.tipo_bem}
                    selecionados={beneficiosSelecionadosIds}
                    onChange={(ids, objs) => {
                      setBeneficiosSelecionadosIds(ids);
                      setBeneficiosSelecionadosObjs(objs);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Valor de Adesão (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number"
                      min={0}
                      max={350}
                      step={0.01}
                      placeholder="0,00"
                      className="pl-10"
                      value={formData.valor_adesao || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v > 350) {
                          toast.error('Valor de adesão não pode ultrapassar R$ 350,00');
                          return;
                        }
                        setFormData(prev => ({ ...prev, valor_adesao: v }));
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Máximo R$ 350,00 — deixe 0 para não cobrar</p>
                  {formData.valor_adesao > 350 && (
                    <p className="text-xs text-destructive">Valor de adesão não pode ultrapassar R$ 350,00</p>
                  )}
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

                {(perfilEditor === 'ADMIN' || perfilEditor === 'GESTOR') && (
                  <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                    <Label className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-3.5 h-3.5" />
                      Percentual de Participação
                    </Label>
                    <Select
                      value={String(percentualParticipacao)}
                      onValueChange={(v) => {
                        setPercentualParticipacao(Number(v) as 7 | 10 | 15);
                        setResultado(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Aplica-se ao valor FIPE para calcular a cota de participação em caso de sinistro.
                    </p>
                  </div>
                )}

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
                  <p className="text-sm text-muted-foreground">Mensalidade Total</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(resultado.valorFinal + valorBeneficiosExtras)}
                  </p>
                  {valorBeneficiosExtras > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Base: {formatCurrency(resultado.valorFinal)} + Extras: {formatCurrency(valorBeneficiosExtras)}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge>{resultado.cotaNome}</Badge>
                    <Badge variant="secondary">{categoriaLabels[resultado.categoria]}</Badge>
                    {beneficiosSelecionadosObjs.length > 0 && (
                      <Badge variant="outline" className="border-primary text-primary">
                        +{beneficiosSelecionadosObjs.length} extra(s)
                      </Badge>
                    )}
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
                    <span className="text-muted-foreground">Ajuste Geral (R$):</span>
                    <span className="font-medium">{formatCurrency(resultado.ajusteGeralValor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ajuste Individual (R$):</span>
                    <span className={`font-medium ${resultado.ajusteIndividualValor !== 0 ? 'text-primary' : ''}`}>
                      {resultado.ajusteIndividualValor > 0 ? '+' : ''}{formatCurrency(resultado.ajusteIndividualValor)}
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
                    <p className="text-sm text-muted-foreground">
                      Participação ({percentualParticipacao}%)
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(parseValorBrasileiro(formData.valor_bem) * (percentualParticipacao / 100))}
                    </p>
                  </div>
                </div>

                {/* Alerta COTA 01 para resultado salvo */}
                {resultado.ehCota01 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-primary mb-1">📋 COTA 01</p>
                    <p className="text-muted-foreground">
                      Valor mínimo de participação: Moto R$ 1.100 | Carro R$ 1.800 | Camionete R$ 2.500
                    </p>
                    {resultado.aplicouValorMinimo && (
                      <p className="text-primary mt-1">
                        ✓ Aplicado (cálculo: {formatCurrency(resultado.participacaoCalculada)})
                      </p>
                    )}
                  </div>
                )}

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
                       formData.carro_reserva_extra === 'mais15' ? '30 dias' : '45 dias'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={() => handleSalvar()} className="flex-1">
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
                    {formatCurrency(previewResult.valorFinal + valorBeneficiosExtras)}
                  </p>
                  {valorBeneficiosExtras > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Base: {formatCurrency(previewResult.valorFinal)} + Extras: {formatCurrency(valorBeneficiosExtras)}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline">{previewResult.cotaNome}</Badge>
                    <Badge variant="secondary">{categoriaLabels[previewResult.categoria]}</Badge>
                    {beneficiosSelecionadosObjs.length > 0 && (
                      <Badge variant="outline" className="border-primary text-primary">
                        +{beneficiosSelecionadosObjs.length} extra(s)
                      </Badge>
                    )}
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
                    <span className="text-muted-foreground">Ajuste Geral (R$):</span>
                    <span>{formatCurrency(previewResult.ajusteGeralValor)}</span>
                  </div>
                  {previewResult.ajusteIndividualValor !== 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Ajuste Individual (R$):</span>
                      <span>{previewResult.ajusteIndividualValor > 0 ? '+' : ''}{formatCurrency(previewResult.ajusteIndividualValor)}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor FIPE</p>
                    <p className="font-medium">{formatCurrency(parseValorBrasileiro(formData.valor_bem))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Participação ({percentualParticipacao}%)
                    </p>
                    <p className="font-medium">
                      {formatCurrency(parseValorBrasileiro(formData.valor_bem) * (percentualParticipacao / 100))}
                    </p>
                  </div>
                </div>

                {/* Alerta COTA 01 - Valor Mínimo */}
                {previewResult.ehCota01 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-primary mb-1">📋 COTA 01 – Valor Mínimo de Participação</p>
                    <p className="text-muted-foreground">
                      Para veículos nesta cota, aplica-se valor mínimo: Moto R$ 1.100 | Carro R$ 1.800 | Camionete R$ 2.500
                    </p>
                    {previewResult.aplicouValorMinimo && (
                      <p className="text-primary mt-1 font-medium">
                        ✓ Valor mínimo aplicado (calculado: {formatCurrency(previewResult.participacaoCalculada)})
                      </p>
                    )}
                  </div>
                )}

                {formData.carro_reserva_extra !== 'nenhum' && (
                  <div className="text-center text-xs text-muted-foreground">
                    Inclui carro reserva adicional: {formData.carro_reserva_extra === 'mais15' ? '+15 dias' : '+30 dias'}
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    onClick={handleConfirmarESalvar} 
                    className="w-full" 
                    size="lg"
                    disabled={isCalculating || cotasLoading || !canCalculate}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isCalculating ? 'Salvando...' : 'Confirmar e Salvar'}
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
