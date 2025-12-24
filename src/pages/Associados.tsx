import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Phone, 
  Mail,
  Car,
  Building2,
  Plus,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import type { Associado, Regiao, AssociateStatus, VehicleType, Cota, Profile } from '@/types/database';
import { associateStatusLabels, vehicleTypeLabels } from '@/types/database';
import { FipeRangeDetector, useFipeRange } from '@/components/FipeRangeDetector';

interface AssociadoWithDetails extends Associado {
  veiculos_count?: number;
  consultor?: Profile | null;
  regiao?: Regiao | null;
}

interface VeiculoForm {
  tipo: VehicleType;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  valor_fipe: number;
}

type WizardStep = 'associado' | 'veiculo' | 'complete';

export default function Associados() {
  const { isAllowed, isChecking } = useAccessControl('consultor_or_above');
  const { user, profile, isAdminPrincipal, hasRole } = useAuth();
  const [associados, setAssociados] = useState<AssociadoWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook centralizado para dados de referência
  const { regioes, cotas, consultores, getRegiaoNome, getConsultorNome } = useReferenceData({
    loadRegioes: true,
    loadCotas: true,
    loadConsultores: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regiaoFilter, setRegiaoFilter] = useState<string>('all');
  const [consultorFilter, setConsultorFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVeiculoDialogOpen, setIsVeiculoDialogOpen] = useState(false);
  const [selectedAssociado, setSelectedAssociado] = useState<AssociadoWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  
  // Wizard state for new associado flow
  const [wizardStep, setWizardStep] = useState<WizardStep>('associado');
  const [newAssociadoId, setNewAssociadoId] = useState<string | null>(null);
  const [isWizardMode, setIsWizardMode] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    telefone: '',
    email: '',
    status: 'ativo' as AssociateStatus,
  });

  const [veiculoForm, setVeiculoForm] = useState<VeiculoForm>({
    tipo: 'carro',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    placa: '',
    valor_fipe: 0,
  });

  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !hasRole('admin_regional');
  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isCadastro = hasRole('cadastro');
  
  const canCreate = isConsultor || isAdminRegional || isAdminPrincipal;
  const canEditAll = isAdminPrincipal || isAdminRegional || isCadastro;

  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchData();
    }
  }, [user?.id, isAdminPrincipal, isConsultor, isAllowed, isChecking]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const fetchData = async () => {
    await fetchAssociados();
  };

  const fetchAssociados = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('associados').select('*');

      if (isConsultor && !isAdminPrincipal && !isAdminRegional) {
        query = query.eq('consultor_id', user!.id);
      } else if (isAdminRegional && profile?.sede_id) {
        const { data: sedeRegioes } = await supabase
          .from('regioes')
          .select('id')
          .eq('sede_id', profile.sede_id);
        
        if (sedeRegioes && sedeRegioes.length > 0) {
          query = query.in('regiao_id', sedeRegioes.map(r => r.id));
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Batch fetch veiculos count
      const associadoIds = (data || []).map(a => a.id);
      const { data: veiculosData } = await supabase
        .from('veiculos')
        .select('associado_id')
        .in('associado_id', associadoIds);

      // Build count map
      const veiculosCountMap = new Map<string, number>();
      (veiculosData || []).forEach(v => {
        veiculosCountMap.set(v.associado_id, (veiculosCountMap.get(v.associado_id) || 0) + 1);
      });

      // Map associados with details using reference data hook (no N+1)
      const associadosWithDetails = (data || []).map(associado => {
        const regiao = regioes.find(r => r.id === associado.regiao_id) || null;
        const consultor = consultores.find(c => c.id === associado.consultor_id) || null;

        return {
          ...associado,
          status: associado.status as AssociateStatus,
          veiculos_count: veiculosCountMap.get(associado.id) || 0,
          consultor,
          regiao,
        };
      });

      setAssociados(associadosWithDetails);
    } catch (error) {
      console.error('Error fetching associados:', error);
      toast.error('Erro ao carregar associados');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setFormData({
      nome_completo: '',
      cpf: '',
      telefone: '',
      email: '',
      status: 'ativo',
    });
    setVeiculoForm({
      tipo: 'carro',
      marca: '',
      modelo: '',
      ano: new Date().getFullYear(),
      placa: '',
      valor_fipe: 0,
    });
    setWizardStep('associado');
    setNewAssociadoId(null);
    setIsWizardMode(false);
    setSelectedAssociado(null);
  };

  const handleOpenNewAssociadoWizard = () => {
    // Validação: Consultor deve estar vinculado a uma Regional
    if (!profile?.regiao_id && !isAdminPrincipal) {
      toast.error('Você não está vinculado a nenhuma Regional. Entre em contato com o administrador.');
      return;
    }
    
    resetForms();
    setIsWizardMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (associado: AssociadoWithDetails) => {
    setSelectedAssociado(associado);
    setFormData({
      nome_completo: associado.nome_completo,
      cpf: associado.cpf,
      telefone: associado.telefone,
      email: associado.email,
      status: associado.status,
    });
    setIsWizardMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenVeiculoDialog = (associado: AssociadoWithDetails) => {
    setSelectedAssociado(associado);
    setVeiculoForm({
      tipo: 'carro',
      marca: '',
      modelo: '',
      ano: new Date().getFullYear(),
      placa: '',
      valor_fipe: 0,
    });
    setIsVeiculoDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isWizardMode && wizardStep === 'veiculo' && newAssociadoId) {
      // Confirm if user wants to close without adding vehicle
      if (!confirm('O cadastro do veículo é obrigatório. Deseja cancelar o cadastro do associado?')) {
        return;
      }
      // Delete the associado if user cancels
      supabase.from('associados').delete().eq('id', newAssociadoId).then(() => {
        toast.info('Cadastro cancelado');
        fetchAssociados();
      });
    }
    setIsDialogOpen(false);
    resetForms();
  };

  const handleSaveAssociado = async () => {
    // Validação: Campos obrigatórios
    if (!formData.nome_completo.trim() || !formData.cpf.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validação: CPF básico (11 dígitos)
    const cpfLimpo = formData.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }

    // Validação: Email válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Email inválido');
      return;
    }

    // Validação: Consultor deve ter regional (para criar novo)
    if (!selectedAssociado && !isWizardMode === false) {
      if (!profile?.regiao_id && !isAdminPrincipal) {
        toast.error('Você não está vinculado a uma Regional. Entre em contato com o administrador.');
        return;
      }
    }

    try {
      // Get consultor's regiao automatically - OBRIGATÓRIO para novos cadastros
      const regiaoId = profile?.regiao_id || null;

      // Validação dupla: Não permitir criar associado sem regional (exceto admin principal)
      if (!selectedAssociado && !regiaoId && !isAdminPrincipal) {
        toast.error('Não é possível cadastrar associado sem estar vinculado a uma Regional.');
        return;
      }

      const associadoData = {
        nome_completo: formData.nome_completo.trim(),
        cpf: cpfLimpo, // CPF limpo (só números)
        telefone: formData.telefone.trim(),
        email: formData.email.trim().toLowerCase(),
        status: formData.status,
        regiao_id: regiaoId, // Auto-link to consultor's regional
      };

      if (selectedAssociado && !isWizardMode) {
        // Editing existing associado
        const { error } = await supabase
          .from('associados')
          .update(associadoData)
          .eq('id', selectedAssociado.id);

        if (error) throw error;
        toast.success('Associado atualizado com sucesso');
        setIsDialogOpen(false);
        fetchAssociados();
      } else {
        // Validação: Novo associado DEVE ter consultor_id
        if (!user?.id) {
          toast.error('Erro de autenticação. Faça login novamente.');
          return;
        }

        // Creating new associado - wizard mode
        const { data, error } = await supabase
          .from('associados')
          .insert({
            ...associadoData,
            consultor_id: user.id, // OBRIGATÓRIO: Link to current consultor
          })
          .select()
          .single();

        if (error) throw error;
        
        setNewAssociadoId(data.id);
        setWizardStep('veiculo');
        toast.success('Associado cadastrado! Agora cadastre o veículo.');
      }
    } catch (error: any) {
      console.error('Error saving associado:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um associado com este CPF');
      } else {
        toast.error(error.message || 'Erro ao salvar associado');
      }
    }
  };

  const handleSaveVeiculo = async () => {
    // Validação: Veículo DEVE ter associado
    const associadoId = isWizardMode ? newAssociadoId : selectedAssociado?.id;
    
    if (!associadoId) {
      toast.error('Erro: Veículo não pode existir sem um Associado vinculado');
      return;
    }

    // Validação: Campos obrigatórios
    if (!veiculoForm.marca.trim() || !veiculoForm.modelo.trim() || !veiculoForm.placa.trim() || veiculoForm.valor_fipe <= 0) {
      toast.error('Preencha todos os campos obrigatórios do veículo');
      return;
    }

    // Validação: Placa válida (formato brasileiro)
    const placaLimpa = veiculoForm.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const placaValida = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaLimpa);
    if (!placaValida) {
      toast.error('Placa inválida. Use o formato ABC1234 ou ABC1D23 (Mercosul)');
      return;
    }

    // Validação: Ano válido
    const anoAtual = new Date().getFullYear();
    if (veiculoForm.ano < 1900 || veiculoForm.ano > anoAtual + 1) {
      toast.error(`Ano deve estar entre 1900 e ${anoAtual + 1}`);
      return;
    }

    // Find appropriate cota based on FIPE value (must be active)
    const cotaApropriada = cotas.find(
      c => veiculoForm.valor_fipe >= c.fipe_min && veiculoForm.valor_fipe <= c.fipe_max && c.ativo
    );

    if (!cotaApropriada) {
      toast.error('Não existe faixa FIPE configurada para este valor. Contate o administrador.');
      return;
    }

    // Calculate mensalidade based on vehicle type
    let mensalidade = 0;
    switch (veiculoForm.tipo) {
      case 'carro':
        mensalidade = cotaApropriada.mensalidade_carro;
        break;
      case 'moto':
        mensalidade = cotaApropriada.mensalidade_moto;
        break;
      case 'pickup':
        mensalidade = cotaApropriada.mensalidade_pickup;
        break;
    }

    try {

      const { error } = await supabase
        .from('veiculos')
        .insert({
          associado_id: associadoId,
          tipo: veiculoForm.tipo,
          marca: veiculoForm.marca.trim(),
          modelo: veiculoForm.modelo.trim(),
          ano: veiculoForm.ano,
          placa: placaLimpa,
          valor_fipe: veiculoForm.valor_fipe,
          cota_id: cotaApropriada?.id || null,
          mensalidade: mensalidade,
          carro_reserva_dias: 15,
        });

      if (error) throw error;

      if (isWizardMode) {
        setWizardStep('complete');
        toast.success('Cadastro completo! Associado e veículo cadastrados com sucesso.');
        setTimeout(() => {
          setIsDialogOpen(false);
          resetForms();
          fetchAssociados();
        }, 1500);
      } else {
        toast.success('Veículo cadastrado com sucesso');
        setIsVeiculoDialogOpen(false);
        fetchAssociados();
      }
    } catch (error: any) {
      console.error('Error saving veiculo:', error);
      toast.error(error.message || 'Erro ao salvar veículo');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'default';
      case 'inadimplente':
        return 'destructive';
      case 'suspenso':
        return 'secondary';
      case 'cancelado':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filteredAssociados = associados.filter((associado) => {
    const matchesSearch =
      associado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      associado.cpf.includes(searchTerm) ||
      associado.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || associado.status === statusFilter;
    const matchesRegiao = regiaoFilter === 'all' || associado.regiao_id === regiaoFilter;
    const matchesConsultor = consultorFilter === 'all' || associado.consultor_id === consultorFilter;

    return matchesSearch && matchesStatus && matchesRegiao && matchesConsultor;
  });

  const groupedByRegiao = regioes.reduce((acc, regiao) => {
    const regiaoAssociados = filteredAssociados.filter(a => a.regiao_id === regiao.id);
    if (regiaoAssociados.length > 0) {
      acc[regiao.id] = {
        regiao,
        associados: regiaoAssociados,
        byConsultor: consultores.reduce((cAcc, consultor) => {
          const consultorAssociados = regiaoAssociados.filter(a => a.consultor_id === consultor.id);
          if (consultorAssociados.length > 0) {
            cAcc[consultor.id] = {
              consultor,
              associados: consultorAssociados,
            };
          }
          return cAcc;
        }, {} as Record<string, { consultor: Profile; associados: AssociadoWithDetails[] }>),
      };
    }
    return acc;
  }, {} as Record<string, { regiao: Regiao; associados: AssociadoWithDetails[]; byConsultor: Record<string, { consultor: Profile; associados: AssociadoWithDetails[] }> }>);

  const stats = {
    total: associados.length,
    ativos: associados.filter(a => a.status === 'ativo').length,
    inadimplentes: associados.filter(a => a.status === 'inadimplente').length,
    veiculos: associados.reduce((acc, a) => acc + (a.veiculos_count || 0), 0),
  };

  const AssociadoRow = ({ associado }: { associado: AssociadoWithDetails }) => {
    const canEditThisAssociado = canEditAll || (isConsultor && associado.consultor_id === user?.id);
    
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {associado.nome_completo
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium">{associado.nome_completo}</p>
              <p className="text-sm text-muted-foreground">CPF: {associado.cpf}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <p className="text-sm flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {associado.email}
            </p>
            <p className="text-sm flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {associado.telefone}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{associado.veiculos_count || 0}</span>
            {canEditThisAssociado && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => handleOpenVeiculoDialog(associado)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell>
          {associado.consultor && (
            <span className="text-sm">{associado.consultor.nome_completo}</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(associado.status)}>
            {associateStatusLabels[associado.status]}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {canEditThisAssociado && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEditDialog(associado)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Wizard steps indicator
  const WizardSteps = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        wizardStep === 'associado' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
      }`}>
        {wizardStep !== 'associado' ? <Check className="h-4 w-4" /> : <span className="w-5 h-5 flex items-center justify-center">1</span>}
        <span>Associado</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        wizardStep === 'veiculo' ? 'bg-primary text-primary-foreground' : 
        wizardStep === 'complete' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        {wizardStep === 'complete' ? <Check className="h-4 w-4" /> : <span className="w-5 h-5 flex items-center justify-center">2</span>}
        <span>Veículo</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Associados</h1>
            <p className="text-muted-foreground">
              {isConsultor && !isAdminPrincipal && !isAdminRegional
                ? 'Gerencie seus associados'
                : 'Gerencie os associados da proteção'}
            </p>
          </div>
          {canCreate && (
            <div className="flex flex-col items-end gap-1">
              <Button 
                onClick={handleOpenNewAssociadoWizard}
                disabled={!profile?.regiao_id && !isAdminPrincipal}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Associado
              </Button>
              {!profile?.regiao_id && !isAdminPrincipal && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Você não está vinculado a uma Regional
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativos
              </CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.ativos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inadimplentes
              </CardTitle>
              <Users className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.inadimplentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Veículos
              </CardTitle>
              <Car className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.veiculos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Associados</CardTitle>
                <CardDescription>
                  Todos os associados cadastrados
                </CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grouped')}>
                <TabsList>
                  <TabsTrigger value="list">Lista</TabsTrigger>
                  <TabsTrigger value="grouped">Por Regional</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inadimplente">Inadimplentes</SelectItem>
                  <SelectItem value="suspenso">Suspensos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              {(isAdminPrincipal || isAdminRegional) && (
                <>
                  <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Regional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {regioes.map((regiao) => (
                        <SelectItem key={regiao.id} value={regiao.id}>
                          {regiao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Consultor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {consultores.map((consultor) => (
                        <SelectItem key={consultor.id} value={consultor.id}>
                          {consultor.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* List View */}
            {viewMode === 'list' && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Associado</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Veículos</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredAssociados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              Nenhum associado encontrado
                            </p>
                            {canCreate && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleOpenNewAssociadoWizard}
                              >
                                Cadastrar primeiro associado
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssociados.map((associado) => (
                        <AssociadoRow key={associado.id} associado={associado} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Grouped View */}
            {viewMode === 'grouped' && (
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(groupedByRegiao).length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum associado encontrado</p>
                  </div>
                ) : (
                  Object.entries(groupedByRegiao).map(([regiaoId, { regiao, associados: regiaoAssociados, byConsultor }]) => (
                    <AccordionItem key={regiaoId} value={regiaoId} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{regiao.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {regiaoAssociados.length} associado(s) • {Object.keys(byConsultor).length} consultor(es)
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="multiple" className="ml-4">
                          {Object.entries(byConsultor).map(([consultorId, { consultor, associados: consultorAssociados }]) => (
                            <AccordionItem key={consultorId} value={consultorId} className="border-l-2 border-muted pl-4">
                              <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{consultor.nome_completo}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    {consultorAssociados.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 mt-2">
                                  {consultorAssociados.map((associado) => (
                                    <div
                                      key={associado.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="text-xs font-medium text-primary">
                                            {associado.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{associado.nome_completo}</p>
                                          <p className="text-xs text-muted-foreground">{associado.telefone}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          <Car className="h-3 w-3 mr-1" />
                                          {associado.veiculos_count || 0}
                                        </Badge>
                                        <Badge variant={getStatusVariant(associado.status)} className="text-xs">
                                          {associateStatusLabels[associado.status]}
                                        </Badge>
                                        {(canEditAll || (isConsultor && associado.consultor_id === user?.id)) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleOpenEditDialog(associado)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Associado Dialog with Wizard */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isWizardMode 
                  ? (wizardStep === 'complete' ? 'Cadastro Completo!' : 'Novo Associado + Veículo')
                  : (selectedAssociado ? 'Editar Associado' : 'Novo Associado')}
              </DialogTitle>
              <DialogDescription>
                {isWizardMode 
                  ? (wizardStep === 'associado' 
                      ? 'Passo 1: Cadastre os dados do associado' 
                      : wizardStep === 'veiculo'
                        ? 'Passo 2: Cadastre o veículo (obrigatório)'
                        : 'Associado e veículo cadastrados com sucesso!')
                  : (selectedAssociado 
                      ? 'Atualize os dados do associado' 
                      : 'Cadastre um novo associado')}
              </DialogDescription>
            </DialogHeader>

            {isWizardMode && <WizardSteps />}

            {/* Step: Associado Data */}
            {((wizardStep === 'associado' && isWizardMode) || !isWizardMode) && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    placeholder="Nome completo do associado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Status (only for editing and for admins) */}
                {selectedAssociado && canEditAll && !isConsultor && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: AssociateStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isWizardMode && (
                  <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      O associado será vinculado automaticamente à sua regional e após o cadastro, será necessário cadastrar pelo menos um veículo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step: Veiculo Data */}
            {wizardStep === 'veiculo' && isWizardMode && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Veículo *</Label>
                  <Select
                    value={veiculoForm.tipo}
                    onValueChange={(value: VehicleType) =>
                      setVeiculoForm({ ...veiculoForm, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carro">Carro</SelectItem>
                      <SelectItem value="moto">Motocicleta</SelectItem>
                      <SelectItem value="pickup">Pickup/Camionete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input
                      value={veiculoForm.marca}
                      onChange={(e) => setVeiculoForm({ ...veiculoForm, marca: e.target.value })}
                      placeholder="Ex: Volkswagen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo *</Label>
                    <Input
                      value={veiculoForm.modelo}
                      onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                      placeholder="Ex: Gol"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ano *</Label>
                    <Input
                      type="number"
                      value={veiculoForm.ano}
                      onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: parseInt(e.target.value) || 0 })}
                      min={1900}
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <Input
                      value={veiculoForm.placa}
                      onChange={(e) => setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })}
                      placeholder="ABC1234"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor FIPE *</Label>
                  <Input
                    type="number"
                    value={veiculoForm.valor_fipe || ''}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, valor_fipe: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 45000"
                  />
                </div>

                <FipeRangeDetector
                  valorFipe={veiculoForm.valor_fipe}
                  tipoVeiculo={veiculoForm.tipo}
                  cotas={cotas}
                />
              </div>
            )}

            {/* Step: Complete */}
            {wizardStep === 'complete' && (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-center text-muted-foreground">
                  O associado e o veículo foram cadastrados com sucesso!
                </p>
              </div>
            )}

            {wizardStep !== 'complete' && (
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                {wizardStep === 'associado' || !isWizardMode ? (
                  <Button onClick={handleSaveAssociado}>
                    {isWizardMode ? 'Próximo: Veículo' : (selectedAssociado ? 'Salvar' : 'Cadastrar')}
                    {isWizardMode && <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                ) : (
                  <Button onClick={handleSaveVeiculo}>
                    Finalizar Cadastro
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Standalone Add Veiculo Dialog (for existing associados) */}
        <Dialog open={isVeiculoDialogOpen} onOpenChange={setIsVeiculoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Veículo</DialogTitle>
              <DialogDescription>
                Vincule um veículo ao associado {selectedAssociado?.nome_completo}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Veículo *</Label>
                <Select
                  value={veiculoForm.tipo}
                  onValueChange={(value: VehicleType) =>
                    setVeiculoForm({ ...veiculoForm, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Motocicleta</SelectItem>
                    <SelectItem value="pickup">Pickup/Camionete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={veiculoForm.marca}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, marca: e.target.value })}
                    placeholder="Ex: Volkswagen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={veiculoForm.modelo}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                    placeholder="Ex: Gol"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input
                    type="number"
                    value={veiculoForm.ano}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: parseInt(e.target.value) || 0 })}
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={veiculoForm.placa}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC1234"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor FIPE *</Label>
                <Input
                  type="number"
                  value={veiculoForm.valor_fipe || ''}
                  onChange={(e) => setVeiculoForm({ ...veiculoForm, valor_fipe: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 45000"
                />
              </div>

              <FipeRangeDetector
                valorFipe={veiculoForm.valor_fipe}
                tipoVeiculo={veiculoForm.tipo}
                cotas={cotas}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVeiculoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVeiculo}>
                Adicionar Veículo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
