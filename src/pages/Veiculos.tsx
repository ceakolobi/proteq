import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useReferenceData } from '@/hooks/useReferenceData';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Car, 
  Search, 
  Edit, 
  Building2,
  Users,
  DollarSign,
  Shield,
  ShieldCheck,
  ShieldX,
  Calendar,
  Plus,
  Bike,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Tractor,
  Loader2
} from 'lucide-react';
import { FipeRangeDetector } from '@/components/FipeRangeDetector';
import PlacaLookup, { VehicleData, PlacaStatus } from '@/components/cotacao/PlacaLookup';
import type { VehicleType, VehicleStatus, Cota, Regiao, Profile, Associado, Sede } from '@/types/database';
import { vehicleTypeLabels, vehicleStatusLabels, getVehicleStatusColor } from '@/types/database';

interface VeiculoWithDetails {
  id: string;
  tipo: VehicleType;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  chassi?: string;
  renavam?: string;
  cor?: string;
  valor_fipe: number;
  cota_id: string | null;
  mensalidade: number;
  mensalidade_manual?: number | null;
  mensalidade_override?: boolean;
  mensalidade_alterada_por?: string | null;
  mensalidade_alterada_em?: string | null;
  protecao_ativa: boolean;
  protecao_ativada_em: string | null;
  veiculo_status: VehicleStatus;
  carro_reserva_dias: number;
  carro_reserva_adicional: number | null;
  created_at: string;
  associado_id: string;
  sede_id: string | null;
  consultor_id: string | null;
  cotacao_id: string | null;
  lead_id: string | null;
  codigo_fipe?: string;
  associado?: Associado | null;
  cota?: Cota | null;
  regiao?: Regiao | null;
  sede?: Sede | null;
  consultor?: Profile | null;
}

const statusTransitions: Record<VehicleStatus, VehicleStatus[]> = {
  cadastrado: ['aguardando_vistoria', 'cancelado'],
  aguardando_vistoria: ['aprovado', 'reprovado', 'cancelado'],
  aprovado: ['ativo', 'cancelado'],
  reprovado: ['aguardando_vistoria', 'cancelado'],
  ativo: ['cancelado'],
  cancelado: []
};

export default function Veiculos() {
  const navigate = useNavigate();
  const { user, profile, isAdminPrincipal, hasRole, hasAnyRole } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');

  // Permissões granulares com fallback por role
  const { canAccessPage, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModuleAccess('veiculos');

  const [veiculos, setVeiculos] = useState<VeiculoWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { sedes, regioes, cotas, consultores, getRegiaoNome, getCotaNome, getConsultorNome, getSedeNome } = useReferenceData({
    loadSedes: true,
    loadRegioes: true,
    loadCotas: true,
    loadConsultores: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [consultorFilter, setConsultorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoWithDetails | null>(null);
  const [associados, setAssociados] = useState<Associado[]>([]);
  
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    placa: '',
    chassi: '',
    renavam: '',
    cor: '',
    valor_fipe: 0,
    tipo: 'carro' as VehicleType,
    veiculo_status: 'cadastrado' as VehicleStatus,
    associado_id: '',
    codigo_fipe: '',
    mes_referencia_fipe: '',
    mensalidade_manual: null as number | null,
    mensalidade_override: false,
    // Novo campo para alterar regional do associado
    associado_regiao_id: '',
  });
  
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [fipeLoaded, setFipeLoaded] = useState(false);

  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isAdminBasico = hasRole('admin_nivel_basico');
  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !isAdminRegional;
  const isCadastro = hasRole('cadastro');
  const isFinanceiro = hasRole('financeiro');
  const isVistoriador = hasRole('vistoriador');
  
  // Usa permissões granulares ou fallback por role
  const canUpdateStatus = isAdminPrincipal || isAdminRegional || isCadastro;
  
  // Admin Principal, Admin Básico e Financeiro podem editar mensalidade manualmente
  const canEditMensalidade = isAdminPrincipal || isAdminBasico || isFinanceiro;
  
  // Apenas Admin Principal e Admin Básico podem trocar a regional
  const canChangeRegiao = isAdminPrincipal || isAdminBasico;

  // Normalizações / validações básicas
  const normalizeChassi = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const normalizeRenavam = (value: string) => value.replace(/\D/g, '');

  // Handler para quando dados do veículo são encontrados pela placa
  // IMPORTANTE: Hooks devem ser declarados ANTES de qualquer early return
  const handleVehicleFound = useCallback((data: VehicleData) => {
    const chassiLimpo = normalizeChassi(data.chassi || '');
    const renavamLimpo = normalizeRenavam(data.renavam || '');

    setFormData(prev => ({
      ...prev,
      marca: data.marca || prev.marca,
      modelo: data.modelo || prev.modelo,
      ano: parseInt(data.ano_modelo) || parseInt(data.ano_fabricacao) || prev.ano,
      // Preencher automaticamente quando a API retornar chassi (sem mascarar)
      chassi: chassiLimpo ? chassiLimpo : prev.chassi,
      // Mantém regra atual para renavam
      renavam: renavamLimpo.length === 11 ? renavamLimpo : prev.renavam,
      cor: data.cor || prev.cor,
      valor_fipe: data.valor_fipe || prev.valor_fipe,
      codigo_fipe: data.codigo_fipe || prev.codigo_fipe,
      mes_referencia_fipe: data.valor_fipe ? new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : prev.mes_referencia_fipe,
    }));

    setFipeLoaded(!!data.valor_fipe);
  }, []);

  const handlePlacaChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, placa: value }));
  }, []);

  const handlePlacaStatusChange = useCallback((status: PlacaStatus) => {
    setPlacaStatus(status);
  }, []);

  useEffect(() => {
    document.title = 'Veículos | Harmony Agro';
  }, []);

  useEffect(() => {
    if (isAllowed && !isChecking && !permissionsLoading && canAccessPage) {
      fetchVeiculos();
      fetchAssociados();
    }
  }, [isAllowed, isChecking, permissionsLoading, canAccessPage, sedes, regioes, cotas, consultores, user?.id, profile?.sede_id, isConsultor, isAdminRegional, isAdminPrincipal, isVistoriador]);

  async function fetchAssociados() {
    try {
      let query = supabase.from('associados').select('*').eq('status', 'ativo');
      
      if (isConsultor && user?.id) {
        query = query.eq('consultor_id', user.id);
      } else if (isAdminRegional && profile?.sede_id) {
        const { data: sedeRegioes } = await supabase
          .from('regioes')
          .select('id')
          .eq('sede_id', profile.sede_id);
        if (sedeRegioes && sedeRegioes.length > 0) {
          query = query.in('regiao_id', sedeRegioes.map(r => r.id));
        }
      }
      
      const { data, error } = await query.order('nome_completo');
      if (error) throw error;
      setAssociados((data || []).map(a => ({ ...a, status: a.status as any })));
    } catch (error) {
      console.error('Error fetching associados:', error);
    }
  }

  if (isChecking || permissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed || !canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Veículos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  async function fetchVeiculos() {
    setIsLoading(true);
    try {
      let query = supabase.from('veiculos').select('*');
      
      // Vistoriador só vê aguardando_vistoria
      if (isVistoriador && !isAdminPrincipal && !isAdminRegional && !isCadastro) {
        query = query.eq('veiculo_status', 'aguardando_vistoria');
      }
      
      const { data: veiculosData, error: veiculosError } = await query.order('created_at', { ascending: false });
      if (veiculosError) throw veiculosError;

      // Get associados for enrichment
      const associadoIds = [...new Set((veiculosData || []).map(v => v.associado_id).filter(Boolean))];
      let associadosData: any[] = [];
      if (associadoIds.length > 0) {
        const { data } = await supabase.from('associados').select('*').in('id', associadoIds);
        associadosData = data || [];
      }

      const veiculosWithDetails = (veiculosData || []).map(veiculo => {
        const associado = associadosData.find(a => a.id === veiculo.associado_id);
        const cota = cotas.find(c => c.id === veiculo.cota_id) || null;
        const regiao = regioes.find(r => r.id === associado?.regiao_id) || null;
        const sede = sedes.find(s => s.id === veiculo.sede_id || s.id === regiao?.sede_id) || null;
        const consultor = consultores.find(c => c.id === veiculo.consultor_id || c.id === associado?.consultor_id) || null;

        return {
          ...veiculo,
          tipo: veiculo.tipo as VehicleType,
          veiculo_status: (veiculo.veiculo_status || 'cadastrado') as VehicleStatus,
          associado: associado ? { ...associado, status: associado.status as any } : null,
          cota,
          regiao,
          sede,
          consultor,
        };
      });

      setVeiculos(veiculosWithDetails);
    } catch (error) {
      console.error('Error fetching veiculos:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenEditDialog = (veiculo: VeiculoWithDetails) => {
    setSelectedVeiculo(veiculo);
    setFormData({
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      placa: veiculo.placa,
      chassi: veiculo.chassi || '',
      renavam: veiculo.renavam || '',
      cor: veiculo.cor || '',
      valor_fipe: veiculo.valor_fipe,
      tipo: veiculo.tipo,
      veiculo_status: veiculo.veiculo_status,
      associado_id: veiculo.associado_id,
      codigo_fipe: veiculo.codigo_fipe || '',
      mes_referencia_fipe: (veiculo as any).mes_referencia_fipe || '',
      mensalidade_manual: veiculo.mensalidade_manual ?? null,
      mensalidade_override: veiculo.mensalidade_override ?? false,
      associado_regiao_id: veiculo.associado?.regiao_id || '',
    });
    setFipeLoaded(veiculo.valor_fipe > 0);
    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setFormData({
      marca: '',
      modelo: '',
      ano: new Date().getFullYear(),
      placa: '',
      chassi: '',
      renavam: '',
      cor: '',
      valor_fipe: 0,
      tipo: 'carro',
      veiculo_status: 'cadastrado',
      associado_id: '',
      codigo_fipe: '',
      mes_referencia_fipe: '',
      mensalidade_manual: null,
      mensalidade_override: false,
      associado_regiao_id: '',
    });
    setPlacaStatus('idle');
    setFipeLoaded(false);
    setIsCreateDialogOpen(true);
  };

  const handleSaveVeiculo = async () => {
    if (!selectedVeiculo) return;

    if (!formData.marca.trim() || !formData.modelo.trim() || !formData.placa.trim() || formData.valor_fipe <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const chassiLimpo = normalizeChassi(formData.chassi);

    // CHASSI: obrigatório (auto-preenchido pela placa quando disponível, ou manual)
    // Regra solicitada: validar tamanho mínimo (sem travar em 17)
    if (chassiLimpo.length < 10) {
      toast.error('Chassi é obrigatório e deve ter no mínimo 10 caracteres');
      return;
    }

    const placaLimpa = formData.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const placaValida = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaLimpa);
    if (!placaValida) {
      toast.error('Placa inválida. Use o formato ABC1234 ou ABC1D23 (Mercosul)');
      return;
    }

    const cotaApropriada = cotas.find(
      c => formData.valor_fipe >= c.fipe_min && formData.valor_fipe <= c.fipe_max && c.ativo
    );

    // Calcula mensalidade automática
    let mensalidadeAutomatica = 0;
    if (cotaApropriada) {
      const mensalidadeKey = `mensalidade_${formData.tipo}` as keyof Cota;
      mensalidadeAutomatica = (cotaApropriada[mensalidadeKey] as number) || 0;
    }

    // Usa mensalidade manual se override estiver ativo, senão usa automática
    const mensalidadeFinal = formData.mensalidade_override && formData.mensalidade_manual !== null
      ? formData.mensalidade_manual
      : mensalidadeAutomatica;

    // Block status change to 'ativo' without FIPE
    if (formData.veiculo_status === 'ativo' && formData.valor_fipe <= 0) {
      toast.error('Não é possível ativar o veículo sem valor FIPE preenchido');
      return;
    }

    try {
      const updateData: any = {
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        ano: formData.ano,
        placa: placaLimpa,
        chassi: chassiLimpo,
        renavam: formData.renavam.trim() || null,
        cor: formData.cor.trim() || null,
        valor_fipe: formData.valor_fipe,
        tipo: formData.tipo,
        veiculo_status: formData.veiculo_status,
        cota_id: cotaApropriada?.id || null,
        mensalidade: mensalidadeFinal,
        codigo_fipe: formData.codigo_fipe || null,
        mes_referencia_fipe: formData.mes_referencia_fipe || null,
        mensalidade_manual: formData.mensalidade_override ? formData.mensalidade_manual : null,
        mensalidade_override: formData.mensalidade_override,
        mensalidade_alterada_por: formData.mensalidade_override ? user?.id : null,
        mensalidade_alterada_em: formData.mensalidade_override ? new Date().toISOString() : null,
      };

      // Set protecao_ativa based on status
      if (formData.veiculo_status === 'ativo') {
        updateData.protecao_ativa = true;
        if (!selectedVeiculo.protecao_ativa) {
          updateData.protecao_ativada_em = new Date().toISOString();
        }
      } else if (formData.veiculo_status === 'cancelado') {
        updateData.protecao_ativa = false;
      }

      const { error } = await supabase
        .from('veiculos')
        .update(updateData)
        .eq('id', selectedVeiculo.id);

      if (error) throw error;

      // Se mudou a regional do associado, atualiza
      if (canChangeRegiao && formData.associado_regiao_id && selectedVeiculo.associado_id) {
        const originalRegiaoId = selectedVeiculo.associado?.regiao_id;
        if (formData.associado_regiao_id !== originalRegiaoId) {
          const { error: assocError } = await supabase
            .from('associados')
            .update({ regiao_id: formData.associado_regiao_id })
            .eq('id', selectedVeiculo.associado_id);
          
          if (assocError) {
            console.error('Erro ao atualizar regional do associado:', assocError);
            toast.error('Veículo salvo, mas houve erro ao atualizar a regional do associado');
          } else {
            toast.success('Veículo e regional do associado atualizados com sucesso');
          }
        } else {
          toast.success('Veículo atualizado com sucesso');
        }
      } else {
        toast.success('Veículo atualizado com sucesso');
      }
      
      setIsDialogOpen(false);
      fetchVeiculos();
    } catch (error: any) {
      console.error('Error saving veiculo:', error);
      toast.error(error.message || 'Erro ao salvar veículo');
    }
  };

  const handleCreateVeiculo = async () => {
    if (!formData.marca.trim() || !formData.modelo.trim() || !formData.placa.trim() || formData.valor_fipe <= 0 || !formData.associado_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const chassiLimpo = normalizeChassi(formData.chassi);

    // CHASSI: obrigatório (auto-preenchido pela placa quando disponível, ou manual)
    if (chassiLimpo.length < 10) {
      toast.error('Chassi é obrigatório e deve ter no mínimo 10 caracteres');
      return;
    }

    const placaLimpa = formData.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const placaValida = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaLimpa);
    if (!placaValida) {
      toast.error('Placa inválida. Use o formato ABC1234 ou ABC1D23 (Mercosul)');
      return;
    }

    // Check if plate already exists
    const { data: existing } = await supabase
      .from('veiculos')
      .select('id')
      .eq('placa', placaLimpa)
      .maybeSingle();
    
    if (existing) {
      toast.error('Já existe um veículo cadastrado com esta placa');
      return;
    }

    const cotaApropriada = cotas.find(
      c => formData.valor_fipe >= c.fipe_min && formData.valor_fipe <= c.fipe_max && c.ativo
    );

    let mensalidade = 0;
    if (cotaApropriada) {
      const mensalidadeKey = `mensalidade_${formData.tipo}` as keyof Cota;
      mensalidade = (cotaApropriada[mensalidadeKey] as number) || 0;
    }

    // Get associado details for sede_id
    const selectedAssociado = associados.find(a => a.id === formData.associado_id);
    let sedeId = null;
    if (selectedAssociado?.regiao_id) {
      const regiao = regioes.find(r => r.id === selectedAssociado.regiao_id);
      sedeId = regiao?.sede_id || null;
    }

    try {
      const insertData = {
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        ano: formData.ano,
        placa: placaLimpa,
        chassi: chassiLimpo,
        renavam: formData.renavam.trim() || null,
        cor: formData.cor.trim() || null,
        valor_fipe: formData.valor_fipe,
        tipo: formData.tipo,
        veiculo_status: formData.veiculo_status,
        cota_id: cotaApropriada?.id || null,
        mensalidade,
        carro_reserva_dias: 15,
        associado_id: formData.associado_id,
        consultor_id: user?.id,
        sede_id: sedeId,
        codigo_fipe: formData.codigo_fipe || null,
        mes_referencia_fipe: formData.mes_referencia_fipe || null,
        protecao_ativa: false,
      };

      const { error } = await supabase.from('veiculos').insert(insertData);

      if (error) throw error;
      toast.success('Veículo cadastrado com sucesso');
      setIsCreateDialogOpen(false);
      fetchVeiculos();
    } catch (error: any) {
      console.error('Error creating veiculo:', error);
      toast.error(error.message || 'Erro ao cadastrar veículo');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getVehicleIcon = (tipo: VehicleType) => {
    switch (tipo) {
      case 'moto':
        return <Bike className="h-4 w-4" />;
      case 'pickup':
      case 'caminhao':
      case 'utilitario':
        return <Truck className="h-4 w-4" />;
      case 'maquina_agricola':
      case 'implemento_agricola':
        return <Tractor className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: VehicleStatus) => {
    switch (status) {
      case 'cadastrado':
        return <FileText className="h-3 w-3" />;
      case 'aguardando_vistoria':
        return <Clock className="h-3 w-3" />;
      case 'aprovado':
        return <CheckCircle className="h-3 w-3" />;
      case 'reprovado':
        return <XCircle className="h-3 w-3" />;
      case 'ativo':
        return <ShieldCheck className="h-3 w-3" />;
      case 'cancelado':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const filteredVeiculos = veiculos.filter((veiculo) => {
    const matchesSearch =
      veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (veiculo.chassi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      veiculo.associado?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = tipoFilter === 'all' || veiculo.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'all' || veiculo.veiculo_status === statusFilter;
    const matchesSede = sedeFilter === 'all' || veiculo.sede?.id === sedeFilter || veiculo.regiao?.sede_id === sedeFilter;
    const matchesConsultor = consultorFilter === 'all' || veiculo.consultor_id === consultorFilter || veiculo.consultor?.id === consultorFilter;

    return matchesSearch && matchesTipo && matchesStatus && matchesSede && matchesConsultor;
  });

  const stats = {
    total: veiculos.length,
    cadastrados: veiculos.filter(v => v.veiculo_status === 'cadastrado').length,
    aguardando: veiculos.filter(v => v.veiculo_status === 'aguardando_vistoria').length,
    ativos: veiculos.filter(v => v.veiculo_status === 'ativo').length,
    reprovados: veiculos.filter(v => v.veiculo_status === 'reprovado').length,
    faturamento: veiculos.filter(v => v.veiculo_status === 'ativo').reduce((acc, v) => acc + (v.mensalidade || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Veículos</h1>
            <p className="text-muted-foreground">
              Gerencie os veículos do sistema de proteção veicular
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Car className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cadastrados</CardTitle>
              <FileText className="h-5 w-5 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.cadastrados}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Aguardando Vistoria</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">{stats.aguardando}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Ativos</CardTitle>
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{stats.ativos}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Reprovados</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{stats.reprovados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(stats.faturamento)}</div>
              <p className="text-xs text-muted-foreground mt-1">mensal</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Veículos</CardTitle>
                <CardDescription>
                  Gerencie veículos cadastrados com status e fluxo de aprovação
                </CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grouped')}>
                <TabsList>
                  <TabsTrigger value="list">Lista</TabsTrigger>
                  <TabsTrigger value="grouped">Por Status</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, chassi, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(vehicleStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(isAdminPrincipal || isAdminRegional) && (
                <Select value={sedeFilter} onValueChange={setSedeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Sedes</SelectItem>
                    {sedes.filter(s => s.ativo).map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>{sede.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(isAdminPrincipal || isAdminRegional) && (
                <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {consultores.filter(c => c.ativo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* List View */}
            {viewMode === 'list' && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor FIPE</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead>Sede</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                      </TableRow>
                    ) : filteredVeiculos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Car className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhum veículo encontrado</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVeiculos.map((veiculo) => (
                        <TableRow key={veiculo.id} className={veiculo.veiculo_status === 'aguardando_vistoria' ? 'bg-amber-50/50' : veiculo.veiculo_status === 'reprovado' ? 'bg-red-50/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                {getVehicleIcon(veiculo.tipo)}
                              </div>
                              <div>
                                <p className="font-medium">{veiculo.marca} {veiculo.modelo}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{veiculo.placa}</span>
                                  <span>•</span>
                                  <span>{veiculo.ano}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{veiculo.associado?.nome_completo || '-'}</p>
                              {veiculo.consultor && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {veiculo.consultor.nome_completo}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getVehicleStatusColor(veiculo.veiculo_status)} flex items-center gap-1 w-fit`}>
                              {getStatusIcon(veiculo.veiculo_status)}
                              {vehicleStatusLabels[veiculo.veiculo_status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatCurrency(veiculo.valor_fipe)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-green-600">{formatCurrency(veiculo.mensalidade)}</span>
                              {veiculo.mensalidade_override && (
                                <span className="text-xs text-amber-600" title="Valor definido manualmente">✎</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {veiculo.sede ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {veiculo.sede.nome}
                              </div>
                            ) : veiculo.regiao ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {veiculo.regiao.nome}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(veiculo)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Grouped View */}
            {viewMode === 'grouped' && (
              <div className="space-y-4">
                {Object.entries(vehicleStatusLabels).map(([status, label]) => {
                  const statusVeiculos = filteredVeiculos.filter(v => v.veiculo_status === status);
                  if (statusVeiculos.length === 0) return null;
                  
                  return (
                    <Accordion key={status} type="single" collapsible>
                      <AccordionItem value={status} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Badge className={`${getVehicleStatusColor(status as VehicleStatus)} flex items-center gap-1`}>
                              {getStatusIcon(status as VehicleStatus)}
                              {label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{statusVeiculos.length} veículo(s)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 mt-2">
                            {statusVeiculos.map((veiculo) => (
                              <div key={veiculo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-background rounded-lg">
                                    {getVehicleIcon(veiculo.tipo)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{veiculo.marca} {veiculo.modelo}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {veiculo.placa} • {veiculo.associado?.nome_completo}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{formatCurrency(veiculo.mensalidade)}</span>
                                  {canEdit && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(veiculo)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Veículo</DialogTitle>
              <DialogDescription>Atualize os dados do veículo e seu status.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {canUpdateStatus && (
                <div className="space-y-2">
                  <Label>Status do Veículo</Label>
                  <Select
                    value={formData.veiculo_status}
                    onValueChange={(value: VehicleStatus) => setFormData({ ...formData, veiculo_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedVeiculo && statusTransitions[selectedVeiculo.veiculo_status]?.map(status => (
                        <SelectItem key={status} value={status}>{vehicleStatusLabels[status]}</SelectItem>
                      ))}
                      <SelectItem value={selectedVeiculo?.veiculo_status || 'cadastrado'}>
                        {vehicleStatusLabels[selectedVeiculo?.veiculo_status || 'cadastrado']} (atual)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seletor de Regional do Associado - apenas para Admin Principal e Admin Básico */}
              {canChangeRegiao && selectedVeiculo?.associado && (
                <div className="space-y-2 p-3 border rounded-lg bg-blue-50/50 border-blue-200">
                  <Label className="flex items-center gap-2 text-blue-800">
                    <Building2 className="h-4 w-4" />
                    Regional do Associado
                  </Label>
                  <p className="text-xs text-blue-700 mb-2">
                    Alterar a regional do associado "{selectedVeiculo.associado.nome_completo}"
                  </p>
                  <Select
                    value={formData.associado_regiao_id}
                    onValueChange={(value) => setFormData({ ...formData, associado_regiao_id: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a regional" />
                    </SelectTrigger>
                    <SelectContent>
                      {regioes.map((regiao) => (
                        <SelectItem key={regiao.id} value={regiao.id}>{regiao.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo de Veículo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: VehicleType) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input type="number" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input value={formData.placa} onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })} maxLength={7} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input value={formData.chassi} onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Renavam</Label>
                  <Input value={formData.renavam} onChange={(e) => setFormData({ ...formData, renavam: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Input value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} />
              </div>

              {/* FIPE Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-base font-semibold">Dados FIPE</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor FIPE *</Label>
                    <Input
                      type="number"
                      value={formData.valor_fipe || ''}
                      onChange={(e) => setFormData({ ...formData, valor_fipe: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mês/Ano Referência</Label>
                    <Input
                      value={formData.mes_referencia_fipe}
                      onChange={(e) => setFormData({ ...formData, mes_referencia_fipe: e.target.value })}
                      placeholder="Ex: dezembro de 2024"
                    />
                  </div>
                </div>

                {formData.codigo_fipe && (
                  <div className="text-sm text-muted-foreground">
                    Código FIPE: <span className="font-mono">{formData.codigo_fipe}</span>
                  </div>
                )}

                {/* Warning for ativo status without FIPE */}
                {formData.veiculo_status === 'ativo' && formData.valor_fipe <= 0 && (
                  <div className="flex items-center gap-2 p-2 border rounded bg-destructive/10 border-destructive/30">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Não é possível ativar veículo sem valor FIPE</span>
                  </div>
                )}
              </div>

              <FipeRangeDetector valorFipe={formData.valor_fipe} tipoVeiculo={formData.tipo} cotas={cotas.filter(c => c.ativo)} />

              {/* Campo de mensalidade manual - apenas Admin e Financeiro */}
              {canEditMensalidade && (
                <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 border-amber-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    <Label className="text-base font-semibold text-amber-800">Ajuste Manual de Mensalidade</Label>
                  </div>
                  <p className="text-xs text-amber-700">
                    Como Admin/Financeiro, você pode definir um valor manual que sobrepõe o cálculo automático.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mensalidade_override"
                        checked={formData.mensalidade_override}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mensalidade_override: e.target.checked,
                          mensalidade_manual: e.target.checked ? (formData.mensalidade_manual || selectedVeiculo?.mensalidade || 0) : null
                        })}
                        className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <Label htmlFor="mensalidade_override" className="text-sm text-amber-800">
                        Usar valor manual
                      </Label>
                    </div>
                    {formData.mensalidade_override && (
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.mensalidade_manual ?? ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            mensalidade_manual: parseFloat(e.target.value) || 0 
                          })}
                          placeholder="Valor da mensalidade"
                          className="border-amber-300 focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                  {formData.mensalidade_override && formData.mensalidade_manual !== null && (
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                      <span>Mensalidade final:</span>
                      <span className="text-lg text-green-600">{formatCurrency(formData.mensalidade_manual)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Indicador para usuários sem permissão quando há override */}
              {!canEditMensalidade && selectedVeiculo && selectedVeiculo.mensalidade_override && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Mensalidade definida manualmente: <span className="font-semibold">{formatCurrency(selectedVeiculo.mensalidade)}</span>
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveVeiculo}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Veículo</DialogTitle>
              <DialogDescription>Cadastre um novo veículo. Digite a placa para buscar automaticamente os dados FIPE.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Associado *</Label>
                <Select value={formData.associado_id} onValueChange={(value) => setFormData({ ...formData, associado_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o associado" />
                  </SelectTrigger>
                  <SelectContent>
                    {associados.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Veículo</Label>
                <Select value={formData.tipo} onValueChange={(value: VehicleType) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PlacaLookup with auto-fill */}
              <PlacaLookup
                value={formData.placa}
                onChange={handlePlacaChange}
                onVehicleFound={handleVehicleFound}
                onStatusChange={handlePlacaStatusChange}
                tipoTemFipe={['carro', 'moto', 'pickup', 'caminhao', 'utilitario'].includes(formData.tipo)}
              />

              {/* Show auto-filled or manual fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input 
                    value={formData.marca} 
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })} 
                    className={fipeLoaded ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input 
                    value={formData.modelo} 
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} 
                    className={fipeLoaded ? 'bg-muted' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input 
                    type="number" 
                    value={formData.ano} 
                    onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) || 0 })} 
                    className={fipeLoaded ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input 
                    value={formData.cor} 
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })} 
                    className={fipeLoaded && formData.cor ? 'bg-muted' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input 
                    value={formData.chassi} 
                    onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })} 
                    className={fipeLoaded && formData.chassi ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renavam</Label>
                  <Input value={formData.renavam} onChange={(e) => setFormData({ ...formData, renavam: e.target.value })} />
                </div>
              </div>

              {/* FIPE Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Dados FIPE</Label>
                  {fipeLoaded ? (
                    <Badge className="bg-green-500">Preenchido automaticamente</Badge>
                  ) : placaStatus === 'found_no_fipe' || placaStatus === 'not_found' ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">Preenchimento manual</Badge>
                  ) : null}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor FIPE *</Label>
                    <Input
                      type="number"
                      value={formData.valor_fipe || ''}
                      onChange={(e) => setFormData({ ...formData, valor_fipe: parseFloat(e.target.value) || 0 })}
                      className={fipeLoaded ? 'bg-background border-green-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mês/Ano Referência</Label>
                    <Input
                      value={formData.mes_referencia_fipe}
                      onChange={(e) => setFormData({ ...formData, mes_referencia_fipe: e.target.value })}
                      placeholder="Ex: dezembro de 2024"
                      className={fipeLoaded ? 'bg-background border-green-500' : ''}
                    />
                  </div>
                </div>

                {formData.codigo_fipe && (
                  <div className="text-sm text-muted-foreground">
                    Código FIPE: <span className="font-mono">{formData.codigo_fipe}</span>
                  </div>
                )}
              </div>

              <FipeRangeDetector valorFipe={formData.valor_fipe} tipoVeiculo={formData.tipo} cotas={cotas.filter(c => c.ativo)} />

              {/* Warning if no FIPE */}
              {!fipeLoaded && formData.valor_fipe <= 0 && (placaStatus === 'found_no_fipe' || placaStatus === 'not_found' || placaStatus === 'idle') && (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Preencha o valor FIPE manualmente para continuar
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleCreateVeiculo}
                disabled={placaStatus === 'loading'}
              >
                {placaStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}