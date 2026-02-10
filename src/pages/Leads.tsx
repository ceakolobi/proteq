import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useDataMasking } from '@/hooks/useDataMasking';
import { useAccessLogger } from '@/hooks/useAccessLogger';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Phone, 
  Mail,
  Clock,
  CheckCircle,
  FileText,
  UserCheck,
  MapPin,
  Car,
  Bike,
  Truck,
  Instagram,
  Facebook,
  Globe,
  MessageCircle,
  PhoneCall,
  Building2,
  XCircle,
  AlertCircle,
  Plus,
  History,
  Tractor,
  LayoutList,
  Kanban,
  MoreVertical,
  Archive,
  Lock,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VehicleType, Profile, Sede } from '@/types/database';
import { vehicleTypeLabels } from '@/types/database';
import { z } from 'zod';
import { LeadKanban } from '@/components/leads/LeadKanban';

// Types
type LeadStatus = 'novo' | 'em_contato' | 'cotado' | 'convertido' | 'perdido';
type LeadOrigem = 'instagram' | 'facebook' | 'indicacao' | 'site' | 'whatsapp' | 'telefone' | 'presencial' | 'outro';
type ViewMode = 'table' | 'kanban';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_veiculo: VehicleType | null;
  origem: LeadOrigem | null;
  status: LeadStatus | null;
  consultor_id: string;
  regiao_id: string | null;
  sede_id: string | null;
  observacoes: string | null;
  convertido: boolean;
  created_at: string;
  updated_at: string;
}

interface LeadInteracao {
  id: string;
  lead_id: string;
  usuario_id: string;
  tipo: string;
  descricao: string;
  data_interacao: string;
  created_at: string;
}

interface LeadWithDetails extends Lead {
  regiao_nome?: string;
  sede_nome?: string;
  consultor_nome?: string;
  interacoes?: LeadInteracao[];
}

const leadStatusLabels: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  cotado: 'Cotado',
  convertido: 'Convertido',
  perdido: 'Perdido'
};

const leadOrigemLabels: Record<LeadOrigem, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  indicacao: 'Indicação',
  site: 'Site',
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  presencial: 'Presencial',
  outro: 'Outro'
};

const getStatusColor = (status: LeadStatus | null): string => {
  const colors: Record<LeadStatus, string> = {
    novo: 'bg-blue-100 text-blue-800 border-blue-200',
    em_contato: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cotado: 'bg-purple-100 text-purple-800 border-purple-200',
    convertido: 'bg-green-100 text-green-800 border-green-200',
    perdido: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status || 'novo'] || colors.novo;
};

const getOrigemIcon = (origem: LeadOrigem | null) => {
  switch (origem) {
    case 'instagram': return <Instagram className="h-3 w-3" />;
    case 'facebook': return <Facebook className="h-3 w-3" />;
    case 'whatsapp': return <MessageCircle className="h-3 w-3" />;
    case 'telefone': return <PhoneCall className="h-3 w-3" />;
    case 'site': return <Globe className="h-3 w-3" />;
    default: return <Users className="h-3 w-3" />;
  }
};

const getVehicleIcon = (tipo: VehicleType | null) => {
  switch (tipo) {
    case 'moto': return <Bike className="h-3 w-3" />;
    case 'caminhao':
    case 'utilitario':
    case 'pickup': return <Truck className="h-3 w-3" />;
    case 'maquina_agricola':
    case 'implemento_agricola': return <Tractor className="h-3 w-3" />;
    default: return <Car className="h-3 w-3" />;
  }
};

const leadSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  telefone: z.string().trim().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(15),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  cidade: z.string().max(100).optional().or(z.literal('')),
  estado: z.string().max(2).optional().or(z.literal('')),
  observacoes: z.string().max(500).optional().or(z.literal('')),
});

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Leads() {
  const { user, profile, isAdminPrincipal, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const masker = useDataMasking();
  const { logViewList } = useAccessLogger();
  
  const { sedes, regioes, consultores, getRegiaoNome, getSedeNome, getConsultorNome, isLoading: refLoading } = useReferenceData({ 
    loadSedes: true,
    loadRegioes: true,
    loadConsultores: true 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddInteracaoOpen, setIsAddInteracaoOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
  const [interacoes, setInteracoes] = useState<LeadInteracao[]>([]);
  const [interacaoForm, setInteracaoForm] = useState({ tipo: 'ligacao', descricao: '' });
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    tipo_veiculo: '' as VehicleType | '',
    origem: 'outro' as LeadOrigem,
    status: 'novo' as LeadStatus,
    observacoes: '',
    regiao_id: '',
    sede_id: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (leads.length > 0) {
      logViewList('lead', leads.length, { statusFilter });
    }
  }, [leads.length, statusFilter, logViewList]);

  const isConsultor = hasRole('consultor_vendas');
  const isAdminRegional = hasRole('admin_regional');
  const isAdminBasico = hasRole('admin_nivel_basico');
  const isGerente = hasRole('gerente');

  const {
    permissions: permissionRows,
    hasPermission,
    isLoading: permissionsLoading,
  } = useUserPermissions(user?.id);

  const hasGranularPermissions = permissionRows.length > 0;

  const roleCanAccessPage =
    isAdminPrincipal ||
    hasAnyRole(['admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas']);

  const canAccessPage = isAdminPrincipal
    ? true
    : hasGranularPermissions
      ? hasPermission('leads', 'visualizar')
      : roleCanAccessPage;

  // Admin Básico e Gerente devem ter acesso total ao módulo de Leads (fallback por role)
  const roleCanCreate =
    isAdminPrincipal || isAdminBasico || isGerente || isAdminRegional || isConsultor;

  const canCreate = isAdminPrincipal
    ? true
    : hasGranularPermissions
      ? hasPermission('leads', 'criar')
      : roleCanCreate;

  const canEdit = isAdminPrincipal
    ? true
    : hasGranularPermissions
      ? hasPermission('leads', 'editar')
      : roleCanCreate;

  const canDelete = isAdminPrincipal
    ? true
    : hasGranularPermissions
      ? hasPermission('leads', 'excluir')
      : roleCanCreate;

  useEffect(() => {
    document.title = 'Leads | Harmony Agro';
  }, []);

  useEffect(() => {
    if (isAllowed && !isChecking && !permissionsLoading && canAccessPage) {
      fetchLeads();
    }
  }, [isAllowed, isChecking, permissionsLoading, canAccessPage, sedes, regioes, consultores]);

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
            <CardDescription>Você não tem permissão para acessar o módulo de Leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  async function fetchLeads() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leadsWithDetails = (data || []).map(lead => ({
        ...lead,
        status: (lead.status || 'novo') as LeadStatus,
        origem: (lead.origem || 'outro') as LeadOrigem,
        tipo_veiculo: lead.tipo_veiculo as VehicleType | null,
        regiao_nome: getRegiaoNome(lead.regiao_id),
        sede_nome: getSedeNome(lead.sede_id),
        consultor_nome: getConsultorNome(lead.consultor_id),
      }));

      setLeads(leadsWithDetails);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchInteracoes(leadId: string) {
    try {
      const { data, error } = await supabase
        .from('lead_interacoes')
        .select('*')
        .eq('lead_id', leadId)
        .order('data_interacao', { ascending: false });

      if (error) throw error;
      setInteracoes(data || []);
    } catch (error) {
      console.error('Error fetching interacoes:', error);
    }
  }

  const handleOpenDialog = (lead?: LeadWithDetails) => {
    setFormErrors({});
    
    if (lead) {
      setSelectedLead(lead);
      setFormData({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || '',
        cidade: lead.cidade || '',
        estado: lead.estado || '',
        tipo_veiculo: lead.tipo_veiculo || '',
        origem: lead.origem || 'outro',
        status: lead.status || 'novo',
        observacoes: lead.observacoes || '',
        regiao_id: lead.regiao_id || '',
        sede_id: lead.sede_id || profile?.sede_id || '',
      });
    } else {
      setSelectedLead(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        cidade: '',
        estado: '',
        tipo_veiculo: '',
        origem: 'outro',
        status: 'novo',
        observacoes: '',
        regiao_id: profile?.regiao_id || '',
        sede_id: profile?.sede_id || '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenHistory = async (lead: LeadWithDetails) => {
    setSelectedLead(lead);
    await fetchInteracoes(lead.id);
    setIsHistoryOpen(true);
  };

  const validateForm = () => {
    try {
      leadSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Corrija os erros do formulário');
      return;
    }

    try {
      // Determine sede_id from regiao if not set
      let sedeId = formData.sede_id;
      if (!sedeId && formData.regiao_id) {
        const regiao = regioes.find(r => r.id === formData.regiao_id);
        sedeId = regiao?.sede_id || '';
      }

      const leadData = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''),
        email: formData.email.trim().toLowerCase() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado || null,
        tipo_veiculo: formData.tipo_veiculo || null,
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
        regiao_id: formData.regiao_id || null,
        sede_id: sedeId || null,
        convertido: formData.status === 'convertido',
      };

      if (selectedLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', selectedLead.id);

        if (error) throw error;
        toast.success('Lead atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('leads')
          .insert({
            ...leadData,
            consultor_id: user!.id,
          });

        if (error) throw error;
        toast.success('Lead cadastrado com sucesso');
      }

      setIsDialogOpen(false);
      fetchLeads();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast.error(error.message || 'Erro ao salvar lead');
    }
  };

  const handleAddInteracao = async () => {
    if (!selectedLead || !interacaoForm.descricao.trim()) {
      toast.error('Preencha a descrição da interação');
      return;
    }

    try {
      const { error } = await supabase.from('lead_interacoes').insert({
        lead_id: selectedLead.id,
        usuario_id: user!.id,
        tipo: interacaoForm.tipo,
        descricao: interacaoForm.descricao.trim(),
      });

      if (error) throw error;
      
      toast.success('Interação registrada');
      setInteracaoForm({ tipo: 'ligacao', descricao: '' });
      setIsAddInteracaoOpen(false);
      await fetchInteracoes(selectedLead.id);
    } catch (error: any) {
      console.error('Error adding interacao:', error);
      toast.error(error.message || 'Erro ao registrar interação');
    }
  };

  const handleConvert = async () => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ convertido: true, status: 'convertido' })
        .eq('id', selectedLead.id);

      if (error) throw error;

      toast.success('Lead convertido! Redirecionando para cotação...');
      setIsConvertDialogOpen(false);
      
      navigate('/cotacoes', { 
        state: { 
          leadId: selectedLead.id, 
          leadNome: selectedLead.nome,
          leadTelefone: selectedLead.telefone,
          leadEmail: selectedLead.email,
          tipoVeiculo: selectedLead.tipo_veiculo,
        }
      });
    } catch (error: any) {
      console.error('Error converting lead:', error);
      toast.error(error.message || 'Erro ao converter lead');
    }
  };

  const handleStatusChange = async (lead: LeadWithDetails, newStatus: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          convertido: newStatus === 'convertido'
        })
        .eq('id', lead.id);

      if (error) throw error;
      toast.success(`Lead movido para "${leadStatusLabels[newStatus]}"`);
      fetchLeads();
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.cidade?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesOrigem = origemFilter === 'all' || lead.origem === origemFilter;
    const matchesSede = sedeFilter === 'all' || lead.sede_id === sedeFilter;

    return matchesSearch && matchesStatus && matchesOrigem && matchesSede;
  });

  const stats = {
    total: leads.length,
    novos: leads.filter(l => l.status === 'novo').length,
    emContato: leads.filter(l => l.status === 'em_contato').length,
    cotados: leads.filter(l => l.status === 'cotado').length,
    convertidos: leads.filter(l => l.status === 'convertido').length,
    perdidos: leads.filter(l => l.status === 'perdido').length,
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const tipoInteracaoLabels: Record<string, string> = {
    ligacao: 'Ligação',
    whatsapp: 'WhatsApp',
    retorno: 'Retorno',
    reuniao: 'Reunião',
    email: 'E-mail',
    visita: 'Visita',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground">Gerencie seus contatos e converta em cotações</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="table" className="gap-1.5">
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5">
                  <Kanban className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {canCreate && (
              <Button onClick={() => handleOpenDialog()}>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Novos</CardTitle>
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{stats.novos}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Em Contato</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700">{stats.emContato}</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Cotados</CardTitle>
              <FileText className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">{stats.cotados}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Convertidos</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{stats.convertidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Perdidos</CardTitle>
              <XCircle className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-500">{stats.perdidos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {viewMode === 'table' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(leadStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Origens</SelectItem>
              {Object.entries(leadOrigemLabels).map(([value, label]) => (
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
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <LeadKanban
            leads={filteredLeads}
            onEdit={(lead) => handleOpenDialog(lead)}
            onConvert={(lead) => {
              setSelectedLead(lead);
              setIsConvertDialogOpen(true);
            }}
            onViewHistory={(lead) => handleOpenHistory(lead)}
            onStatusChange={handleStatusChange}
            canEdit={canEdit}
            masker={masker}
          />
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Leads</CardTitle>
              <CardDescription>Todos os seus contatos e potenciais clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell>
                      </TableRow>
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhum lead encontrado</p>
                            {canCreate && !searchTerm && statusFilter === 'all' && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
                                Cadastrar primeiro lead
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className={lead.status === 'novo' ? 'bg-blue-50/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {lead.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{lead.nome}</p>
                                {lead.tipo_veiculo && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    {getVehicleIcon(lead.tipo_veiculo)}
                                    {vehicleTypeLabels[lead.tipo_veiculo]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {masker.telefone(lead.telefone)}
                              </p>
                              {lead.email && (
                                <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {masker.email(lead.email)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(lead.cidade || lead.estado) ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {lead.cidade}{lead.cidade && lead.estado && '/'}{lead.estado}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell>
                            {lead.origem && (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                {getOrigemIcon(lead.origem)}
                                {leadOrigemLabels[lead.origem]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(lead.status)} flex items-center gap-1 w-fit`}>
                              {leadStatusLabels[lead.status || 'novo']}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{lead.consultor_nome || '-'}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isAdminPrincipal && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(lead)} title="Editar">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenHistory(lead)}>
                                    <History className="mr-2 h-4 w-4" />
                                    Histórico
                                  </DropdownMenuItem>
                                  {lead.status !== 'convertido' && lead.status !== 'perdido' && canCreate && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          navigate('/cotacoes', {
                                            state: { leadId: lead.id, leadNome: lead.nome, tipoVeiculo: lead.tipo_veiculo }
                                          });
                                        }}
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Criar Cotação
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedLead(lead);
                                          setIsConvertDialogOpen(true);
                                        }}
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Converter
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isAdminPrincipal && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(lead, 'perdido')}
                                      >
                                        <Archive className="mr-2 h-4 w-4" />
                                        Arquivar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (confirm('Tem certeza que deseja excluir este lead?')) {
                                            try {
                                              const { error } = await supabase.from('leads').delete().eq('id', lead.id);
                                              if (error) throw error;
                                              toast.success('Lead excluído com sucesso');
                                              fetchLeads();
                                            } catch (err: any) {
                                              toast.error(err.message || 'Erro ao excluir lead');
                                            }
                                          }
                                        }}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
              <DialogDescription>
                {selectedLead ? 'Atualize os dados do lead' : 'Cadastre um novo contato'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={formErrors.nome ? 'border-destructive' : ''}
                  />
                  {formErrors.nome && <p className="text-sm text-destructive">{formErrors.nome}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={formatPhone(formData.telefone)}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
                    maxLength={15}
                    className={formErrors.telefone ? 'border-destructive' : ''}
                  />
                  {formErrors.telefone && <p className="text-sm text-destructive">{formErrors.telefone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={formErrors.email ? 'border-destructive' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Veículo</Label>
                  <Select value={formData.tipo_veiculo} onValueChange={(value: VehicleType) => setFormData({ ...formData, tipo_veiculo: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={formData.origem} onValueChange={(value: LeadOrigem) => setFormData({ ...formData, origem: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(leadOrigemLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: LeadStatus) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(leadStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sede</Label>
                  <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.filter(s => s.ativo).map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>{sede.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{selectedLead ? 'Salvar' : 'Cadastrar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Sheet */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Histórico de Interações</SheetTitle>
              <SheetDescription>Lead: {selectedLead?.nome}</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Interações</h4>
                <Button size="sm" onClick={() => setIsAddInteracaoOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-200px)]">
                {interacoes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma interação registrada</p>
                ) : (
                  <div className="space-y-4">
                    {interacoes.map((interacao) => (
                      <div key={interacao.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{tipoInteracaoLabels[interacao.tipo] || interacao.tipo}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(interacao.data_interacao).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm">{interacao.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        {/* Add Interacao Dialog */}
        <Dialog open={isAddInteracaoOpen} onOpenChange={setIsAddInteracaoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Interação</DialogTitle>
              <DialogDescription>Adicione uma nova interação com o lead</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Contato</Label>
                <Select value={interacaoForm.tipo} onValueChange={(value) => setInteracaoForm({ ...interacaoForm, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoInteracaoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={interacaoForm.descricao}
                  onChange={(e) => setInteracaoForm({ ...interacaoForm, descricao: e.target.value })}
                  rows={4}
                  placeholder="Descreva a interação..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddInteracaoOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddInteracao}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert Confirmation Dialog */}
        <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Converter Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja converter o lead <strong>{selectedLead?.nome}</strong>?
                Você será redirecionado para criar uma cotação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConvert}>Converter</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}