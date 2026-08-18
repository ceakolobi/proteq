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
  ClipboardCheck,
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
  MapPin,
  Camera,
  FileText,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  InspectionStatus, 
  TipoVistoria, 
  inspectionStatusLabels, 
  tipoVistoriaLabels,
  getInspectionStatusColor 
} from '@/types/database';
import VistoriaChecklist, { CHECKLIST_ITEMS, isChecklistComplete, fotosArrayToObject } from '@/components/vistoria/VistoriaChecklist';

interface VistoriaDB {
  id: string;
  veiculo_id: string;
  vistoriador_id: string | null;
  proposta_id: string | null;
  status: InspectionStatus;
  tipo_vistoria: TipoVistoria | null;
  data_agendada: string | null;
  data_realizada: string | null;
  solicitada_em: string | null;
  local_vistoria: string | null;
  observacoes: string | null;
  parecer_tecnico: string | null;
  checklist: Record<string, boolean> | null;
  fotos: string[] | null;
  sede_id: string | null;
  consultor_id: string | null;
  created_at: string;
  updated_at: string;
}

interface VeiculoOption {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  associado_id: string;
  veiculo_status: string | null;
  associados?: {
    nome_completo: string;
  } | null;
}

interface VistoriadorOption {
  id: string;
  nome_completo: string;
}

interface ConsultorOption {
  id: string;
  nome_completo: string;
}

interface SedeOption {
  id: string;
  nome: string;
}

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
  agendada: { label: 'Agendada', variant: 'default' as const, icon: CalendarClock },
  em_andamento: { label: 'Em Andamento', variant: 'default' as const, icon: Loader2 },
  aprovada: { label: 'Aprovada', variant: 'default' as const, icon: CheckCircle },
  reprovada: { label: 'Reprovada', variant: 'destructive' as const, icon: XCircle },
  dispensada: { label: 'Dispensada', variant: 'default' as const, icon: CheckCircle },
};

export default function Vistorias() {
  const navigate = useNavigate();
  const { user, profile, hasAnyRole, hasRole, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking, userSedeId } = useAccessControl('authenticated');

  // Permissões granulares com fallback por role
  const { canAccessPage, canCreate: canCreateVistoria, canEdit, isLoading: permissionsLoading } = useModuleAccess('vistorias');

  const canAssignVistoriador = isAdminPrincipal || hasAnyRole(['admin_regional', 'cadastro']);
  const canApproveReject = isAdminPrincipal || hasAnyRole(['admin_regional', 'cadastro']);
  const isVistoriador = hasRole('vistoriador');
  const isFinanceiro = hasRole('financeiro');
  const canStartInspection = isVistoriador;

  const [vistorias, setVistorias] = useState<VistoriaDB[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoOption[]>([]);
  const [vistoriadores, setVistoriadores] = useState<VistoriadorOption[]>([]);
  const [consultores, setConsultores] = useState<ConsultorOption[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [vistoriadorFilter, setVistoriadorFilter] = useState<string>('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [selectedVistoria, setSelectedVistoria] = useState<VistoriaDB | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFotoKey, setUploadingFotoKey] = useState<string | null>(null);

  // Form states
  const [formVeiculoId, setFormVeiculoId] = useState('');
  const [formTipoVistoria, setFormTipoVistoria] = useState<TipoVistoria>('pre_adesao');
  const [formLocalVistoria, setFormLocalVistoria] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formDataAgendada, setFormDataAgendada] = useState('');
  const [formVistoriadorId, setFormVistoriadorId] = useState('');
  const [formStatus, setFormStatus] = useState<InspectionStatus>('pendente');
  const [formParecerTecnico, setFormParecerTecnico] = useState('');
  const [formChecklist, setFormChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = 'Vistorias | Harmony Agro';
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch vistorias
      const { data: vistoriasData, error: vistoriasError } = await supabase
        .from('vistorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (vistoriasError) throw vistoriasError;
      setVistorias((vistoriasData || []) as VistoriaDB[]);

      // Fetch veiculos for dropdown
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('id, marca, modelo, placa, ano, associado_id, veiculo_status, associados(nome_completo)')
        .order('created_at', { ascending: false });

      if (veiculosError) throw veiculosError;
      setVeiculos((veiculosData || []) as VeiculoOption[]);

      // Fetch vistoriadores (users with vistoriador role)
      const { data: vistoriadorRoles, error: vistoriadorRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'vistoriador');

      if (vistoriadorRolesError) throw vistoriadorRolesError;

      if (vistoriadorRoles && vistoriadorRoles.length > 0) {
        const userIds = vistoriadorRoles.map(r => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', userIds)
          .eq('ativo', true);

        if (profilesError) throw profilesError;
        setVistoriadores((profilesData || []) as VistoriadorOption[]);
      }

      // Fetch consultores (users with consultor_vendas role)
      const { data: consultorRoles, error: consultorRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');

      if (consultorRolesError) throw consultorRolesError;

      if (consultorRoles && consultorRoles.length > 0) {
        const consultorIds = consultorRoles.map(r => r.user_id);
        const { data: consultorProfiles, error: consultorProfilesError } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', consultorIds)
          .eq('ativo', true);

        if (consultorProfilesError) throw consultorProfilesError;
        setConsultores((consultorProfiles || []) as ConsultorOption[]);
      }

      // Fetch sedes
      const { data: sedesData, error: sedesError } = await supabase
        .from('sedes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (sedesError) throw sedesError;
      setSedes((sedesData || []) as SedeOption[]);

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
    setFormTipoVistoria('pre_adesao');
    setFormLocalVistoria('');
    setFormObservacoes('');
    setFormDataAgendada('');
    setFormVistoriadorId('');
    setFormStatus('pendente');
    setFormParecerTecnico('');
    setFormChecklist({});
  };

  const handleViewModalPhotoUpload = async (key: string, file: File) => {
    if (!selectedVistoria || !file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem máx. 5MB'); return; }

    setUploadingFotoKey(key);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedVistoria.id}/${key}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vistoria-fotos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('vistoria-fotos').getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      // Remove URL antiga para essa key (mantém as demais), adiciona a nova
      const oldFotos = selectedVistoria.fotos || [];
      const filteredFotos = oldFotos.filter(url => {
        const match = url.match(/\/([a-z_]+)_\d+\.[a-z]+(?:\?.*)?$/i);
        return !match || match[1] !== key;
      });
      const newFotos = [...filteredFotos, newUrl];
      const newChecklist = { ...(selectedVistoria.checklist || {}), [key]: true };

      const { error: updateError } = await supabase
        .from('vistorias')
        .update({ fotos: newFotos, checklist: newChecklist })
        .eq('id', selectedVistoria.id);
      if (updateError) throw updateError;

      const updated = { ...selectedVistoria, fotos: newFotos, checklist: newChecklist };
      setSelectedVistoria(updated);
      setVistorias(prev => prev.map(v => v.id === selectedVistoria.id ? updated : v));

      toast.success(`${CHECKLIST_ITEMS.find(i => i.key === key)?.label} enviada!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar foto');
    } finally {
      setUploadingFotoKey(null);
    }
  };

  const handleCreateVistoria = async () => {
    if (!formVeiculoId) {
      toast.error('Selecione um veículo');
      return;
    }

    setIsSaving(true);
    try {      
      const insertData = {
        veiculo_id: formVeiculoId,
        tipo_vistoria: formTipoVistoria as TipoVistoria,
        local_vistoria: formLocalVistoria || null,
        observacoes: formObservacoes || null,
        status: (formVistoriadorId && formDataAgendada ? 'agendada' : 'pendente') as InspectionStatus,
        consultor_id: user?.id || null,
        sede_id: userSedeId || null,
        company_id: profile?.company_id ?? null,
        vistoriador_id: formVistoriadorId || null,
        data_agendada: formDataAgendada || null,
      };

      const { error } = await supabase.from('vistorias').insert(insertData);

      if (error) throw error;

      // Update vehicle status to aguardando_vistoria
      await supabase
        .from('veiculos')
        .update({ veiculo_status: 'aguardando_vistoria' })
        .eq('id', formVeiculoId);

      toast.success('Vistoria solicitada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating vistoria:', error);
      toast.error('Erro ao solicitar vistoria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVistoria = async () => {
    if (!selectedVistoria) return;

    // Validate checklist is complete before approving/rejecting
    if ((formStatus === 'aprovada' || formStatus === 'reprovada')) {
      if (!isChecklistComplete(selectedVistoria.checklist)) {
        toast.error('Não é possível aprovar/reprovar sem o checklist completo com todas as fotos');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        status: formStatus,
        local_vistoria: formLocalVistoria || null,
        observacoes: formObservacoes || null,
        parecer_tecnico: formParecerTecnico || null,
      };

      if (formVistoriadorId) {
        updateData.vistoriador_id = formVistoriadorId;
      }
      if (formDataAgendada) {
        updateData.data_agendada = formDataAgendada;
        if (formStatus === 'pendente' && formVistoriadorId) {
          updateData.status = 'agendada';
        }
      }
      if (formStatus === 'aprovada' || formStatus === 'reprovada') {
        updateData.data_realizada = new Date().toISOString();
      }

      const { error } = await supabase
        .from('vistorias')
        .update(updateData as never)
        .eq('id', selectedVistoria.id);

      if (error) throw error;

      toast.success('Vistoria atualizada com sucesso!');

      // Após aprovação: gerar contrato e enviar ao associado
      if (formStatus === 'aprovada') {
        const { data: veiculoData } = await supabase
          .from('veiculos')
          .select('associado_id')
          .eq('id', selectedVistoria.veiculo_id)
          .maybeSingle();

        const associadoId = (veiculoData as any)?.associado_id as string | null;
        if (associadoId) {
          // Gera contrato e envia por email (fire-and-forget)
          supabase.functions
            .invoke('generate-contract-manual', {
              body: { associadoId, veiculoId: selectedVistoria.veiculo_id, sendEmail: true },
            })
            .then(({ error: cErr }) => {
              if (cErr) console.warn('Contrato não gerado:', cErr.message);
              else toast.success('Contrato gerado e enviado ao associado!');
            })
            .catch((e) => console.warn('Erro ao gerar contrato:', e));

          // Se houver termo pendente, reenvia link de assinatura
          supabase
            .from('termos_aceite' as any)
            .select('id')
            .eq('associado_id', associadoId)
            .eq('status', 'pendente')
            .maybeSingle()
            .then(({ data: termo }) => {
              if ((termo as any)?.id) {
                supabase.functions
                  .invoke('send-termo-aceite', {
                    body: { termoId: (termo as any).id, canal: 'email' },
                  })
                  .catch((e) => console.warn('Erro ao enviar termo:', e));
              }
            });
        }
      }

      setIsEditDialogOpen(false);
      setSelectedVistoria(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating vistoria:', error);
      toast.error('Erro ao atualizar vistoria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChecklist = async () => {
    if (!selectedVistoria) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('vistorias')
        .update({ 
          checklist: formChecklist,
          status: 'em_andamento'
        })
        .eq('id', selectedVistoria.id);

      if (error) throw error;

      toast.success('Checklist salvo com sucesso!');
      setIsChecklistDialogOpen(false);
      setSelectedVistoria(null);
      fetchData();
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Erro ao salvar checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (vistoria: VistoriaDB) => {
    setSelectedVistoria(vistoria);
    setFormStatus(vistoria.status);
    setFormLocalVistoria(vistoria.local_vistoria || '');
    setFormObservacoes(vistoria.observacoes || '');
    setFormParecerTecnico(vistoria.parecer_tecnico || '');
    setFormVistoriadorId(vistoria.vistoriador_id || '');
    setFormDataAgendada(vistoria.data_agendada ? vistoria.data_agendada.split('T')[0] : '');
    setIsEditDialogOpen(true);
  };

  const openChecklistDialog = (vistoria: VistoriaDB) => {
    setSelectedVistoria(vistoria);
    setFormChecklist(vistoria.checklist || {});
    setIsChecklistDialogOpen(true);
  };

  const openViewDialog = (vistoria: VistoriaDB) => {
    setSelectedVistoria(vistoria);
    setIsViewDialogOpen(true);
  };

  const getVeiculoDisplay = (veiculoId: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    if (!veiculo) return veiculoId.slice(0, 8);
    return `${veiculo.marca} ${veiculo.modelo} - ${veiculo.placa}`;
  };

  const getVistoriadorDisplay = (vistoriadorId: string | null) => {
    if (!vistoriadorId) return 'Não atribuído';
    const vistoriador = vistoriadores.find(v => v.id === vistoriadorId);
    return vistoriador?.nome_completo || 'Desconhecido';
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

  // Status transition rules based on role
  const getAllowedStatusTransitions = (currentStatus: InspectionStatus): InspectionStatus[] => {
    if (canApproveReject) {
      // Admin Principal, Admin Regional, Cadastro can do all transitions
      return ['pendente', 'agendada', 'em_andamento', 'aprovada', 'reprovada'];
    }
    if (canStartInspection) {
      // Vistoriador can only move to "em_andamento"
      if (currentStatus === 'agendada') {
        return ['agendada', 'em_andamento'];
      }
      return [currentStatus];
    }
    return [currentStatus];
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

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Redirecionando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Vistorias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const filteredVistorias = vistorias.filter((v) => {
    const search = searchTerm.toLowerCase();
    const veiculoInfo = getVeiculoDisplay(v.veiculo_id).toLowerCase();
    const matchesSearch =
      v.id.toLowerCase().includes(search) ||
      veiculoInfo.includes(search) ||
      (v.observacoes || '').toLowerCase().includes(search) ||
      (v.local_vistoria || '').toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || v.tipo_vistoria === tipoFilter;
    const matchesSede = sedeFilter === 'all' || v.sede_id === sedeFilter;
    const matchesVistoriador = vistoriadorFilter === 'all' || v.vistoriador_id === vistoriadorFilter;

    return matchesSearch && matchesStatus && matchesTipo && matchesSede && matchesVistoriador;
  });

  const stats = {
    total: vistorias.length,
    pendentes: vistorias.filter((v) => v.status === 'pendente').length,
    agendadas: vistorias.filter((v) => v.status === 'agendada').length,
    emAndamento: vistorias.filter((v) => v.status === 'em_andamento').length,
    aprovadas: vistorias.filter((v) => v.status === 'aprovada').length,
    reprovadas: vistorias.filter((v) => v.status === 'reprovada').length,
    dispensadas: vistorias.filter((v) => v.status === 'dispensada').length,
  };

  const veiculosAguardandoVistoria = veiculos.filter(v => v.veiculo_status === 'aguardando_vistoria');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Vistorias
            </h1>
            <p className="text-muted-foreground">Gerenciamento de vistorias veiculares</p>
          </div>
          {canCreateVistoria && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Vistoria
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Solicitar Nova Vistoria</DialogTitle>
                  <DialogDescription>Preencha os dados para solicitar uma vistoria</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Veículo *</Label>
                    <Select value={formVeiculoId} onValueChange={setFormVeiculoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {veiculos.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.marca} {v.modelo} - {v.placa} ({v.ano})
                            {v.associados?.nome_completo && ` - ${v.associados.nome_completo}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Vistoria</Label>
                    <Select value={formTipoVistoria} onValueChange={(v) => setFormTipoVistoria(v as TipoVistoria)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre_adesao">Pré-adesão</SelectItem>
                        <SelectItem value="renovacao">Renovação</SelectItem>
                        <SelectItem value="reinspecao">Reinspeção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Local da Vistoria</Label>
                    <Input
                      value={formLocalVistoria}
                      onChange={(e) => setFormLocalVistoria(e.target.value)}
                      placeholder="Endereço ou 'Remoto'"
                    />
                  </div>
                  {canAssignVistoriador && (
                    <>
                      <div className="space-y-2">
                        <Label>Vistoriador</Label>
                        <Select value={formVistoriadorId} onValueChange={setFormVistoriadorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Atribuir vistoriador (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {vistoriadores.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.nome_completo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data Agendada</Label>
                        <Input
                          type="date"
                          value={formDataAgendada}
                          onChange={(e) => setFormDataAgendada(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formObservacoes}
                      onChange={(e) => setFormObservacoes(e.target.value)}
                      placeholder="Informações adicionais..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateVistoria} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Solicitar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-6" aria-label="Indicadores de vistorias">
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
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4 text-blue-600" /> Agendadas
              </CardDescription>
              <CardTitle className="text-2xl text-blue-700">{stats.agendadas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 text-purple-600" /> Em Andamento
              </CardDescription>
              <CardTitle className="text-2xl text-purple-700">{stats.emAndamento}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" /> Aprovadas
              </CardDescription>
              <CardTitle className="text-2xl text-green-700">{stats.aprovadas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" /> Reprovadas
              </CardDescription>
              <CardTitle className="text-2xl text-red-700">{stats.reprovadas}</CardTitle>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
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
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="reprovada">Reprovada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="pre_adesao">Pré-adesão</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                    <SelectItem value="reinspecao">Reinspeção</SelectItem>
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
                {canAssignVistoriador && (
                  <Select value={vistoriadorFilter} onValueChange={setVistoriadorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vistoriador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Vistoriadores</SelectItem>
                      {vistoriadores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Vistorias Table */}
        <main>
          <Card>
            <CardHeader>
              <CardTitle>Lista de Vistorias</CardTitle>
              <CardDescription>{filteredVistorias.length} vistoria(s) encontrada(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredVistorias.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma vistoria encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solicitação</TableHead>
                        <TableHead>Vistoriador</TableHead>
                        <TableHead>Data Agendada</TableHead>
                        <TableHead>Sede</TableHead>
                        <TableHead>Consultor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVistorias.map((vistoria) => {
                        const StatusIcon = statusConfig[vistoria.status]?.icon || Clock;
                        const isPending = vistoria.status === 'pendente';
                        const isEmAndamento = vistoria.status === 'em_andamento';
                        const isReprovada = vistoria.status === 'reprovada';
                        
                        return (
                          <TableRow 
                            key={vistoria.id}
                            className={
                              isPending ? 'bg-amber-50/30' : 
                              isEmAndamento ? 'bg-purple-50/30' :
                              isReprovada ? 'bg-red-50/30' : ''
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{getVeiculoDisplay(vistoria.veiculo_id)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {vistoria.tipo_vistoria ? (
                                <Badge variant="outline">
                                  {tipoVistoriaLabels[vistoria.tipo_vistoria]}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig[vistoria.status]?.variant || 'secondary'}
                                className={`flex items-center gap-1 w-fit ${getInspectionStatusColor(vistoria.status)}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {inspectionStatusLabels[vistoria.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vistoria.solicitada_em ? (
                                <span className="text-sm">
                                  {format(new Date(vistoria.solicitada_em), 'dd/MM/yy', { locale: ptBR })}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{getVistoriadorDisplay(vistoria.vistoriador_id)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {vistoria.data_agendada ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {format(new Date(vistoria.data_agendada), 'dd/MM/yyyy', { locale: ptBR })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Não agendada</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getSedeDisplay(vistoria.sede_id)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getConsultorDisplay(vistoria.consultor_id)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openViewDialog(vistoria)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!isFinanceiro && (
                                  <>
                                    {(canApproveReject || (isVistoriador && vistoria.vistoriador_id === user?.id)) && (
                                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(vistoria)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {/* Checklist button - always visible for viewing, editable only for vistoriador in em_andamento */}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openChecklistDialog(vistoria)}
                                      title={
                                        vistoria.status === 'em_andamento' && isVistoriador && vistoria.vistoriador_id === user?.id 
                                          ? 'Preencher Checklist' 
                                          : 'Ver Checklist'
                                      }
                                    >
                                      <Camera className={`h-4 w-4 ${
                                        vistoria.status === 'em_andamento' && isVistoriador && vistoria.vistoriador_id === user?.id
                                          ? 'text-primary'
                                          : isChecklistComplete(vistoria.checklist)
                                            ? 'text-green-600'
                                            : ''
                                      }`} />
                                    </Button>
                                  </>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Vistoria</DialogTitle>
            </DialogHeader>
            {selectedVistoria && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Veículo</Label>
                    <p className="font-medium">{getVeiculoDisplay(selectedVistoria.veiculo_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{selectedVistoria.tipo_vistoria ? tipoVistoriaLabels[selectedVistoria.tipo_vistoria] : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={getInspectionStatusColor(selectedVistoria.status)}>
                      {inspectionStatusLabels[selectedVistoria.status]}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Solicitação</Label>
                    <p className="font-medium">
                      {selectedVistoria.solicitada_em 
                        ? format(new Date(selectedVistoria.solicitada_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vistoriador</Label>
                    <p className="font-medium">{getVistoriadorDisplay(selectedVistoria.vistoriador_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Consultor Responsável</Label>
                    <p className="font-medium">{getConsultorDisplay(selectedVistoria.consultor_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sede Responsável</Label>
                    <p className="font-medium">{getSedeDisplay(selectedVistoria.sede_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Agendada</Label>
                    <p className="font-medium">
                      {selectedVistoria.data_agendada 
                        ? format(new Date(selectedVistoria.data_agendada), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Realizada</Label>
                    <p className="font-medium">
                      {selectedVistoria.data_realizada 
                        ? format(new Date(selectedVistoria.data_realizada), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Local</Label>
                    <p className="font-medium">{selectedVistoria.local_vistoria || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="font-medium">{selectedVistoria.observacoes || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Parecer Técnico</Label>
                    <p className="font-medium">{selectedVistoria.parecer_tecnico || '-'}</p>
                  </div>
                </div>
                {/* Checklist with photos */}
                <div>
                  <Label className="text-muted-foreground mb-3 block">Checklist de Fotos</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(() => {
                      const photos = fotosArrayToObject(selectedVistoria.fotos, selectedVistoria.id);
                      return CHECKLIST_ITEMS.map((item) => {
                        const hasPhoto = !!photos[item.key];
                        const isChecked = selectedVistoria.checklist?.[item.key];
                        const isUploadingThis = uploadingFotoKey === item.key;

                        return (
                          <div key={item.key} className={`border rounded-lg p-2 ${hasPhoto ? 'border-green-300 bg-green-50/50' : 'border-muted'}`}>
                            <div className="flex items-center gap-1 mb-2">
                              {isChecked || hasPhoto ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span className="text-xs font-medium truncate">{item.label}</span>
                            </div>
                            {hasPhoto ? (
                              <div className="relative group">
                                <img
                                  src={photos[item.key]}
                                  alt={item.label}
                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(photos[item.key], '_blank')}
                                />
                                {canApproveReject && (
                                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      disabled={!!uploadingFotoKey}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleViewModalPhotoUpload(item.key, f);
                                        e.target.value = '';
                                      }}
                                    />
                                    {isUploadingThis
                                      ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                                      : <Camera className="h-5 w-5 text-white" />}
                                  </label>
                                )}
                              </div>
                            ) : canApproveReject ? (
                              <label className={`w-full h-20 bg-muted/30 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors ${isUploadingThis ? 'pointer-events-none' : ''}`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  disabled={!!uploadingFotoKey}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleViewModalPhotoUpload(item.key, f);
                                    e.target.value = '';
                                  }}
                                />
                                {isUploadingThis
                                  ? <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                  : <>
                                      <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                                      <span className="text-xs text-muted-foreground">Enviar</span>
                                    </>}
                              </label>
                            ) : (
                              <div className="w-full h-20 bg-muted/30 rounded flex items-center justify-center">
                                <Camera className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Vistoria</DialogTitle>
              <DialogDescription>Atualize os dados da vistoria</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formStatus} 
                  onValueChange={(v) => setFormStatus(v as InspectionStatus)}
                  disabled={!canApproveReject && !canStartInspection}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowedStatusTransitions(selectedVistoria?.status || 'pendente').map((status) => (
                      <SelectItem key={status} value={status}>
                        {inspectionStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isVistoriador && !canApproveReject && (
                  <p className="text-xs text-muted-foreground">
                    Vistoriadores só podem alterar para "Em Andamento" quando a vistoria estiver agendada.
                  </p>
                )}
              </div>
              {canAssignVistoriador && (
                <>
                  <div className="space-y-2">
                    <Label>Vistoriador</Label>
                    <Select value={formVistoriadorId} onValueChange={setFormVistoriadorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Atribuir vistoriador" />
                      </SelectTrigger>
                      <SelectContent>
                        {vistoriadores.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Agendada</Label>
                    <Input
                      type="date"
                      value={formDataAgendada}
                      onChange={(e) => setFormDataAgendada(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Local da Vistoria</Label>
                <Input
                  value={formLocalVistoria}
                  onChange={(e) => setFormLocalVistoria(e.target.value)}
                  placeholder="Endereço ou 'Remoto'"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Parecer Técnico</Label>
                <Textarea
                  value={formParecerTecnico}
                  onChange={(e) => setFormParecerTecnico(e.target.value)}
                  placeholder="Parecer do vistoriador..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateVistoria} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Checklist Dialog - uses new component with photo upload */}
        {selectedVistoria && (
          <VistoriaChecklist
            isOpen={isChecklistDialogOpen}
            onClose={() => {
              setIsChecklistDialogOpen(false);
              setSelectedVistoria(null);
            }}
            vistoriaId={selectedVistoria.id}
            vistoriaStatus={selectedVistoria.status}
            existingPhotos={fotosArrayToObject(selectedVistoria.fotos, selectedVistoria.id)}
            existingChecklist={selectedVistoria.checklist || {}}
            canEdit={canApproveReject || (isVistoriador && selectedVistoria.vistoriador_id === user?.id)}
            onSave={fetchData}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
