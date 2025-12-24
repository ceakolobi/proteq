import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useReferenceData } from '@/hooks/useReferenceData';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Phone, 
  Mail,
  TrendingUp,
  UserCheck,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { Lead, Regiao } from '@/types/database';
import { z } from 'zod';

// Validation schema
const leadSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  telefone: z.string().trim().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(15),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  observacoes: z.string().max(500).optional().or(z.literal('')),
});

interface LeadWithRegiao extends Lead {
  regiao_nome?: string;
}

export default function Leads() {
  const { user, profile, isAdminPrincipal, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  
  const [leads, setLeads] = useState<LeadWithRegiao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Usar hook centralizado para regiões
  const { regioes, getRegiaoNome, isLoading: refLoading } = useReferenceData({ loadRegioes: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'converted'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRegiao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    observacoes: '',
    regiao_id: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isConsultor = hasRole('consultor_vendas');
  const isAdminRegional = hasRole('admin_regional');
  const canAccessPage = hasAnyRole(['admin_regional', 'consultor_vendas']);

  useEffect(() => {
    document.title = 'Leads | MARKA CRM';
  }, []);

  useEffect(() => {
    if (isAllowed && !isChecking && canAccessPage) {
      fetchLeads();
    }
  }, [isAllowed, isChecking, canAccessPage]);

  // Show loading while checking access
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

  if (!canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Leads.
            </CardDescription>
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
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Consultor vê apenas seus leads
      if (isConsultor && !isAdminPrincipal && !isAdminRegional) {
        query = query.eq('consultor_id', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map regiao names using the reference data hook (single query already done)
      const leadsWithRegiao = (data || []).map(lead => ({
        ...lead,
        regiao_nome: getRegiaoNome(lead.regiao_id),
      }));

      setLeads(leadsWithRegiao);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenDialog = (lead?: LeadWithRegiao) => {
    setFormErrors({});
    
    if (lead) {
      setSelectedLead(lead);
      setFormData({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || '',
        observacoes: lead.observacoes || '',
        regiao_id: lead.regiao_id || profile?.regiao_id || '',
      });
    } else {
      setSelectedLead(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        observacoes: '',
        regiao_id: profile?.regiao_id || '',
      });
    }
    setIsDialogOpen(true);
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
      const leadData = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''),
        email: formData.email.trim().toLowerCase() || null,
        observacoes: formData.observacoes.trim() || null,
        regiao_id: formData.regiao_id || profile?.regiao_id || null,
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

  const handleConvert = async () => {
    if (!selectedLead) return;

    try {
      // Mark lead as converted
      const { error } = await supabase
        .from('leads')
        .update({ convertido: true })
        .eq('id', selectedLead.id);

      if (error) throw error;

      toast.success('Lead marcado como convertido! Redirecionando para cadastro de associado...');
      setIsConvertDialogOpen(false);
      
      // Navigate to new associate form with lead data
      navigate('/associados/novo', { 
        state: { 
          leadData: {
            nome: selectedLead.nome,
            telefone: selectedLead.telefone,
            email: selectedLead.email,
          }
        }
      });
    } catch (error: any) {
      console.error('Error converting lead:', error);
      toast.error(error.message || 'Erro ao converter lead');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'open' && !lead.convertido) ||
      (filterStatus === 'converted' && lead.convertido);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: leads.length,
    open: leads.filter(l => !l.convertido).length,
    converted: leads.filter(l => l.convertido).length,
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Leads</h1>
            <p className="text-muted-foreground">
              Gerencie seus contatos e converta em associados
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
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
                Em Aberto
              </CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando conversão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convertidos
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.converted}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 
                  ? `${Math.round((stats.converted / stats.total) * 100)}% de conversão`
                  : '--'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Leads</CardTitle>
            <CardDescription>
              Todos os seus contatos e potenciais associados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(value: 'all' | 'open' | 'converted') => setFilterStatus(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
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
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {searchTerm || filterStatus !== 'all' 
                              ? 'Nenhum lead encontrado'
                              : 'Nenhum lead cadastrado'}
                          </p>
                          {!searchTerm && filterStatus === 'all' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenDialog()}
                            >
                              Cadastrar primeiro lead
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {lead.nome
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{lead.nome}</p>
                              {lead.observacoes && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {lead.observacoes}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {formatPhone(lead.telefone)}
                            </p>
                            {lead.email && (
                              <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {lead.regiao_nome || '--'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={lead.convertido ? 'default' : 'secondary'}>
                            {lead.convertido ? 'Convertido' : 'Em Aberto'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(lead)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!lead.convertido && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsConvertDialogOpen(true);
                                }}
                                title="Converter em Associado"
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedLead ? 'Editar Lead' : 'Novo Lead'}
              </DialogTitle>
              <DialogDescription>
                {selectedLead
                  ? 'Atualize os dados do lead'
                  : 'Cadastre um novo contato para acompanhamento'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Nome completo"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className={formErrors.nome ? 'border-destructive' : ''}
                />
                {formErrors.nome && (
                  <p className="text-sm text-destructive">{formErrors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={formatPhone(formData.telefone)}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })
                  }
                  maxLength={15}
                  className={formErrors.telefone ? 'border-destructive' : ''}
                />
                {formErrors.telefone && (
                  <p className="text-sm text-destructive">{formErrors.telefone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações sobre o contato..."
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {selectedLead ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert Confirmation Dialog */}
        <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Converter Lead em Associado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja converter o lead <strong>{selectedLead?.nome}</strong> em associado?
                Você será redirecionado para o formulário de cadastro com os dados preenchidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConvert}>
                Converter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
