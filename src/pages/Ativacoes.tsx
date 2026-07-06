import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Plus,
  Eye,
  Edit,
  User,
  Car,
  AlertTriangle,
  Ban,
  PauseCircle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AtivacaoStatus = 'pendente_financeiro' | 'ativo' | 'suspenso' | 'cancelado';

interface AtivacaoDB {
  id: string;
  veiculo_id: string;
  associado_id: string;
  sede_id: string | null;
  consultor_id: string | null;
  numero_contrato: string;
  plano: string | null;
  categoria: string | null;
  cobertura_resumida: string | null;
  data_ativacao: string;
  data_vencimento: string | null;
  status: AtivacaoStatus;
  observacoes: string | null;
  ativado_por: string | null;
  ativado_em: string | null;
  suspenso_por: string | null;
  suspenso_em: string | null;
  motivo_suspensao: string | null;
  cancelado_por: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
}

interface VeiculoAprovado {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  associado_id: string;
  veiculo_status: string | null;
  valor_fipe: number;
  cota_id: string | null;
  sede_id: string | null;
  consultor_id: string | null;
  associados?: {
    id: string;
    nome_completo: string;
  } | null;
  cotas?: {
    id: string;
    cota_nome: string;
  } | null;
}

interface SedeOption {
  id: string;
  nome: string;
}

interface ConsultorOption {
  id: string;
  nome_completo: string;
}

const statusConfig: Record<AtivacaoStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle; color: string }> = {
  pendente_financeiro: { label: 'Pendente Financeiro', variant: 'secondary', icon: Clock, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  ativo: { label: 'Ativo', variant: 'default', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
  suspenso: { label: 'Suspenso', variant: 'secondary', icon: PauseCircle, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
};

export default function Ativacoes() {
  const navigate = useNavigate();
  const { user, profile, hasAnyRole, hasRole, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking, userSedeId } = useAccessControl('authenticated');

  // Permissões granulares com fallback por role
  const { canAccessPage, canCreate, canEdit, isLoading: permissionsLoading } = useModuleAccess('contratos');

  const canActivate = isAdminPrincipal || hasAnyRole(['admin_regional', 'cadastro']);
  const canSuspend = isAdminPrincipal || hasAnyRole(['admin_regional', 'financeiro']);
  const canCancel = isAdminPrincipal || hasRole('admin_regional');
  const isConsultor = hasRole('consultor_vendas');
  const isFinanceiro = hasRole('financeiro');

  const [ativacoes, setAtivacoes] = useState<AtivacaoDB[]>([]);
  const [veiculosAprovados, setVeiculosAprovados] = useState<VeiculoAprovado[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [consultores, setConsultores] = useState<ConsultorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [consultorFilter, setConsultorFilter] = useState<string>('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedAtivacao, setSelectedAtivacao] = useState<AtivacaoDB | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formVeiculoId, setFormVeiculoId] = useState('');
  const [formNumeroContrato, setFormNumeroContrato] = useState('');
  const [formPlano, setFormPlano] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formCobertura, setFormCobertura] = useState('');
  const [formDataVencimento, setFormDataVencimento] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formStatus, setFormStatus] = useState<AtivacaoStatus>('pendente_financeiro');
  const [formMotivoSuspensao, setFormMotivoSuspensao] = useState('');
  const [formMotivoCancelamento, setFormMotivoCancelamento] = useState('');

  useEffect(() => {
    document.title = 'Ativações | Harmony Agro';
  }, []);

  const generateContractNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `PV-${year}-${random}`;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch ativacoes
      const { data: ativacoesData, error: ativacoesError } = await supabase
        .from('ativacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (ativacoesError) throw ativacoesError;
      setAtivacoes((ativacoesData || []) as AtivacaoDB[]);

      // Fetch veiculos aprovados (para ativação) - que ainda não têm ativação
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('id, marca, modelo, placa, ano, associado_id, veiculo_status, valor_fipe, cota_id, sede_id, consultor_id, associados(id, nome_completo), cotas(id, cota_nome)')
        .eq('veiculo_status', 'aprovado')
        .order('created_at', { ascending: false });

      if (veiculosError) throw veiculosError;
      
      // Filter out vehicles that already have an activation
      const veiculosIds = (ativacoesData || []).map((a: AtivacaoDB) => a.veiculo_id);
      const veiculosDisponiveis = (veiculosData || []).filter((v: VeiculoAprovado) => !veiculosIds.includes(v.id));
      setVeiculosAprovados(veiculosDisponiveis as VeiculoAprovado[]);

      // Fetch sedes
      const { data: sedesData, error: sedesError } = await supabase
        .from('sedes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (sedesError) throw sedesError;
      setSedes((sedesData || []) as SedeOption[]);

      // Fetch consultores
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', userIds)
          .eq('ativo', true);

        if (profilesError) throw profilesError;
        setConsultores((profilesData || []) as ConsultorOption[]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed && !isChecking && canAccessPage) {
      fetchData();
    }
  }, [isAllowed, isChecking, canAccessPage, fetchData]);

  const resetForm = () => {
    setFormVeiculoId('');
    setFormNumeroContrato(generateContractNumber());
    setFormPlano('');
    setFormCategoria('');
    setFormCobertura('');
    setFormDataVencimento('');
    setFormObservacoes('');
    setFormStatus('pendente_financeiro');
    setFormMotivoSuspensao('');
    setFormMotivoCancelamento('');
  };

  const handleCreateAtivacao = async () => {
    if (!formVeiculoId) {
      toast.error('Selecione um veículo');
      return;
    }
    if (!formNumeroContrato) {
      toast.error('Número do contrato é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const veiculo = veiculosAprovados.find(v => v.id === formVeiculoId);
      if (!veiculo) {
        toast.error('Veículo não encontrado');
        return;
      }

      // Check for duplicate
      const { data: existing } = await supabase
        .from('ativacoes')
        .select('id')
        .eq('veiculo_id', formVeiculoId)
        .single();

      if (existing) {
        toast.error('Este veículo já possui uma ativação');
        return;
      }

      const insertData = {
        veiculo_id: formVeiculoId,
        associado_id: veiculo.associado_id,
        sede_id: veiculo.sede_id || userSedeId || null,
        company_id: profile?.company_id ?? null,
        consultor_id: isConsultor ? user?.id : veiculo.consultor_id,
        numero_contrato: formNumeroContrato,
        plano: formPlano || veiculo.cotas?.cota_nome || null,
        categoria: formCategoria || null,
        cobertura_resumida: formCobertura || null,
        data_ativacao: new Date().toISOString().split('T')[0],
        data_vencimento: formDataVencimento || null,
        status: (isConsultor ? 'pendente_financeiro' : formStatus) as AtivacaoStatus,
        observacoes: formObservacoes || null,
        ativado_por: !isConsultor && formStatus === 'ativo' ? user?.id : null,
        ativado_em: !isConsultor && formStatus === 'ativo' ? new Date().toISOString() : null,
      };

      const { error } = await supabase.from('ativacoes').insert(insertData);

      if (error) throw error;

      toast.success(isConsultor ? 'Solicitação de ativação enviada!' : 'Ativação criada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating ativacao:', error);
      toast.error('Erro ao criar ativação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: AtivacaoStatus) => {
    if (!selectedAtivacao) return;

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
      };

      if (newStatus === 'ativo') {
        updateData.ativado_por = user?.id;
        updateData.ativado_em = new Date().toISOString();
      } else if (newStatus === 'suspenso') {
        updateData.suspenso_por = user?.id;
        updateData.suspenso_em = new Date().toISOString();
        updateData.motivo_suspensao = formMotivoSuspensao;
      } else if (newStatus === 'cancelado') {
        updateData.cancelado_por = user?.id;
        updateData.cancelado_em = new Date().toISOString();
        updateData.motivo_cancelamento = formMotivoCancelamento;
      }

      const { error } = await supabase
        .from('ativacoes')
        .update(updateData as never)
        .eq('id', selectedAtivacao.id);

      if (error) throw error;

      toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
      setIsEditDialogOpen(false);
      setIsSuspendDialogOpen(false);
      setIsCancelDialogOpen(false);
      setSelectedAtivacao(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSaving(false);
    }
  };

  const openViewDialog = (ativacao: AtivacaoDB) => {
    setSelectedAtivacao(ativacao);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (ativacao: AtivacaoDB) => {
    setSelectedAtivacao(ativacao);
    setFormStatus(ativacao.status);
    setIsEditDialogOpen(true);
  };

  const openSuspendDialog = (ativacao: AtivacaoDB) => {
    setSelectedAtivacao(ativacao);
    setFormMotivoSuspensao('');
    setIsSuspendDialogOpen(true);
  };

  const openCancelDialog = (ativacao: AtivacaoDB) => {
    setSelectedAtivacao(ativacao);
    setFormMotivoCancelamento('');
    setIsCancelDialogOpen(true);
  };

  const getVeiculoInfo = (veiculoId: string) => {
    // Try to find in approved vehicles first
    const veiculo = veiculosAprovados.find(v => v.id === veiculoId);
    if (veiculo) {
      return { 
        display: `${veiculo.marca} ${veiculo.modelo} - ${veiculo.placa}`,
        proprietario: veiculo.associados?.nome_completo || '-'
      };
    }
    return { display: veiculoId.slice(0, 8), proprietario: '-' };
  };

  const getSedeDisplay = (sedeId: string | null) => {
    if (!sedeId) return '-';
    const sede = sedes.find(s => s.id === sedeId);
    return sede?.nome || '-';
  };

  const getConsultorDisplay = (consultorId: string | null) => {
    if (!consultorId) return '-';
    const consultor = consultores.find(c => c.id === consultorId);
    return consultor?.nome_completo || '-';
  };

  if (isChecking) {
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
              Você não tem permissão para acessar o módulo de Ativações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const filteredAtivacoes = ativacoes.filter((a) => {
    const search = searchTerm.toLowerCase();
    const veiculoInfo = getVeiculoInfo(a.veiculo_id);
    const matchesSearch =
      a.numero_contrato.toLowerCase().includes(search) ||
      veiculoInfo.display.toLowerCase().includes(search) ||
      veiculoInfo.proprietario.toLowerCase().includes(search) ||
      (a.plano || '').toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSede = sedeFilter === 'all' || a.sede_id === sedeFilter;
    const matchesConsultor = consultorFilter === 'all' || a.consultor_id === consultorFilter;

    return matchesSearch && matchesStatus && matchesSede && matchesConsultor;
  });

  const stats = {
    total: ativacoes.length,
    pendentes: ativacoes.filter((a) => a.status === 'pendente_financeiro').length,
    ativos: ativacoes.filter((a) => a.status === 'ativo').length,
    suspensos: ativacoes.filter((a) => a.status === 'suspenso').length,
    cancelados: ativacoes.filter((a) => a.status === 'cancelado').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Ativações / Adesões
            </h1>
            <p className="text-muted-foreground">Gerenciamento de proteções veiculares ativas</p>
          </div>
          {veiculosAprovados.length > 0 && (canActivate || isConsultor) && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isConsultor ? 'Solicitar Ativação' : 'Nova Ativação'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{isConsultor ? 'Solicitar Ativação' : 'Nova Ativação de Proteção'}</DialogTitle>
                  <DialogDescription>
                    {isConsultor ? 'Sua solicitação será enviada para aprovação' : 'Ativar proteção para veículo aprovado'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Veículo Aprovado *</Label>
                    <Select value={formVeiculoId} onValueChange={setFormVeiculoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {veiculosAprovados.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.marca} {v.modelo} - {v.placa} ({v.ano})
                            {v.associados?.nome_completo && ` - ${v.associados.nome_completo}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {veiculosAprovados.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum veículo aprovado disponível para ativação</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Número do Contrato *</Label>
                    <Input
                      value={formNumeroContrato}
                      onChange={(e) => setFormNumeroContrato(e.target.value)}
                      placeholder="PV-2024-00001"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plano</Label>
                      <Input
                        value={formPlano}
                        onChange={(e) => setFormPlano(e.target.value)}
                        placeholder="Ex: Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input
                        value={formCategoria}
                        onChange={(e) => setFormCategoria(e.target.value)}
                        placeholder="Ex: Carro Passeio"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cobertura Resumida</Label>
                    <Textarea
                      value={formCobertura}
                      onChange={(e) => setFormCobertura(e.target.value)}
                      placeholder="Descreva a cobertura..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={formDataVencimento}
                      onChange={(e) => setFormDataVencimento(e.target.value)}
                    />
                  </div>
                  {!isConsultor && canActivate && (
                    <div className="space-y-2">
                      <Label>Status Inicial</Label>
                      <Select value={formStatus} onValueChange={(v) => setFormStatus(v as AtivacaoStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente_financeiro">Pendente Financeiro</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formObservacoes}
                      onChange={(e) => setFormObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateAtivacao} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isConsultor ? 'Solicitar' : 'Criar Ativação'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-5" aria-label="Indicadores de ativações">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-600" /> Pendentes
              </CardDescription>
              <CardTitle className="text-2xl text-amber-700">{stats.pendentes}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" /> Ativos
              </CardDescription>
              <CardTitle className="text-2xl text-green-700">{stats.ativos}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <PauseCircle className="h-4 w-4 text-orange-600" /> Suspensos
              </CardDescription>
              <CardTitle className="text-2xl text-orange-700">{stats.suspensos}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" /> Cancelados
              </CardDescription>
              <CardTitle className="text-2xl text-red-700">{stats.cancelados}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Filters */}
        <section aria-label="Filtros">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por contrato, placa, nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pendente_financeiro">Pendente Financeiro</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                {(isAdminPrincipal || hasRole('admin_regional')) && (
                  <Select value={sedeFilter} onValueChange={setSedeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Sedes</SelectItem>
                      {sedes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!isConsultor && (
                  <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Consultor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Consultores</SelectItem>
                      {consultores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Ativacoes Table */}
        <main>
          <Card>
            <CardHeader>
              <CardTitle>Lista de Ativações</CardTitle>
              <CardDescription>{filteredAtivacoes.length} ativação(ões) encontrada(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAtivacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ativação encontrada</p>
                  {veiculosAprovados.length > 0 && canActivate && (
                    <p className="text-sm mt-2">
                      Existem {veiculosAprovados.length} veículo(s) aprovado(s) aguardando ativação
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Proprietário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Ativação</TableHead>
                        <TableHead>Sede</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAtivacoes.map((ativacao) => {
                        const StatusIcon = statusConfig[ativacao.status]?.icon || Clock;
                        const veiculoInfo = getVeiculoInfo(ativacao.veiculo_id);
                        const isPendente = ativacao.status === 'pendente_financeiro';
                        const isSuspenso = ativacao.status === 'suspenso';
                        const isCancelado = ativacao.status === 'cancelado';
                        
                        return (
                          <TableRow 
                            key={ativacao.id}
                            className={
                              isPendente ? 'bg-amber-50/30' : 
                              isSuspenso ? 'bg-orange-50/30' :
                              isCancelado ? 'bg-red-50/30' : ''
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">{ativacao.numero_contrato}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{veiculoInfo.display}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{veiculoInfo.proprietario}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{ativacao.plano || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`flex items-center gap-1 w-fit ${statusConfig[ativacao.status]?.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[ativacao.status]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(ativacao.data_ativacao), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getSedeDisplay(ativacao.sede_id)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openViewDialog(ativacao)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canActivate && isPendente && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedAtivacao(ativacao);
                                      handleUpdateStatus('ativo');
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {canSuspend && ativacao.status === 'ativo' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-orange-600 hover:text-orange-700"
                                    onClick={() => openSuspendDialog(ativacao)}
                                  >
                                    <PauseCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {canActivate && isSuspenso && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedAtivacao(ativacao);
                                      handleUpdateStatus('ativo');
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {canCancel && !isCancelado && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => openCancelDialog(ativacao)}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Ativação</DialogTitle>
            </DialogHeader>
            {selectedAtivacao && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Número do Contrato</Label>
                    <p className="font-mono font-medium">{selectedAtivacao.numero_contrato}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={statusConfig[selectedAtivacao.status]?.color}>
                      {statusConfig[selectedAtivacao.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Veículo</Label>
                    <p className="font-medium">{getVeiculoInfo(selectedAtivacao.veiculo_id).display}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Proprietário</Label>
                    <p className="font-medium">{getVeiculoInfo(selectedAtivacao.veiculo_id).proprietario}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plano</Label>
                    <p className="font-medium">{selectedAtivacao.plano || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Categoria</Label>
                    <p className="font-medium">{selectedAtivacao.categoria || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Ativação</Label>
                    <p className="font-medium">
                      {format(new Date(selectedAtivacao.data_ativacao), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Vencimento</Label>
                    <p className="font-medium">
                      {selectedAtivacao.data_vencimento 
                        ? format(new Date(selectedAtivacao.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sede</Label>
                    <p className="font-medium">{getSedeDisplay(selectedAtivacao.sede_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Consultor</Label>
                    <p className="font-medium">{getConsultorDisplay(selectedAtivacao.consultor_id)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Cobertura</Label>
                    <p className="font-medium">{selectedAtivacao.cobertura_resumida || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="font-medium">{selectedAtivacao.observacoes || '-'}</p>
                  </div>
                  {selectedAtivacao.motivo_suspensao && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Motivo da Suspensão</Label>
                      <p className="font-medium text-orange-700">{selectedAtivacao.motivo_suspensao}</p>
                    </div>
                  )}
                  {selectedAtivacao.motivo_cancelamento && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Motivo do Cancelamento</Label>
                      <p className="font-medium text-red-700">{selectedAtivacao.motivo_cancelamento}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <PauseCircle className="h-5 w-5" />
                Suspender Proteção
              </DialogTitle>
              <DialogDescription>
                A proteção será suspensa e o veículo ficará sem cobertura até reativação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo da Suspensão *</Label>
                <Textarea
                  value={formMotivoSuspensao}
                  onChange={(e) => setFormMotivoSuspensao(e.target.value)}
                  placeholder="Descreva o motivo da suspensão..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>Cancelar</Button>
              <Button 
                variant="default" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => handleUpdateStatus('suspenso')}
                disabled={isSaving || !formMotivoSuspensao}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Suspender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                Cancelar Proteção
              </DialogTitle>
              <DialogDescription>
                <span className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Esta ação é irreversível! O veículo será marcado como cancelado.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo do Cancelamento *</Label>
                <Textarea
                  value={formMotivoCancelamento}
                  onChange={(e) => setFormMotivoCancelamento(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Voltar</Button>
              <Button 
                variant="destructive"
                onClick={() => handleUpdateStatus('cancelado')}
                disabled={isSaving || !formMotivoCancelamento}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
