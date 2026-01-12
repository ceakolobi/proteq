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
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Phone, 
  Mail,
  Building2,
  TrendingUp,
  Loader2
} from 'lucide-react';
import type { Profile, Regiao, Sede } from '@/types/database';
import { z } from 'zod';

// Validation schema
const consultorSchema = z.object({
  nome_completo: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().trim().email('E-mail inválido').max(255),
  telefone: z.string().trim().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(15).optional().or(z.literal('')),
  cpf: z.string().trim().min(11, 'CPF deve ter 11 dígitos').max(14).optional().or(z.literal('')),
  regiao_id: z.string().uuid('Região inválida'),
});

interface ConsultorWithStats extends Profile {
  leads_count?: number;
  associados_count?: number;
  regiao_nome?: string;
  sede_nome?: string;
}

export default function Consultores() {
  const { profile, isAdminPrincipal, hasRole } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('admin_or_gerente_or_financeiro', { redirectOnDeny: false });
  
  const [consultores, setConsultores] = useState<ConsultorWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Hook centralizado para dados de referência
  const { regioes, sedes, getRegiaoNome, getSedeNome } = useReferenceData({ 
    loadRegioes: true, 
    loadSedes: true 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState<ConsultorWithStats | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    regiao_id: '',
    ativo: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isAdminRegional = hasRole('admin_regional');

  const fetchConsultores = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Get all profiles that have consultor_vendas role
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');

      if (rolesError) throw rolesError;

      const consultorIds = rolesData?.map(r => r.user_id) || [];
      
      if (consultorIds.length === 0) {
        setConsultores([]);
        setIsLoading(false);
        return;
      }

      // Build query based on user role
      let query = supabase
        .from('profiles')
        .select('*')
        .in('id', consultorIds)
        .order('nome_completo');

      // Admin Regional can only see consultores from their sede
      if (isAdminRegional && !isAdminPrincipal && profile?.sede_id) {
        query = query.eq('sede_id', profile.sede_id);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Batch fetch all counts in parallel
      const ids = (profilesData || []).map(c => c.id);
      
      if (ids.length === 0) {
        setConsultores([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch leads and associados counts in batch
      const [leadsData, associadosData] = await Promise.all([
        supabase.from('leads').select('consultor_id').in('consultor_id', ids),
        supabase.from('associados').select('consultor_id').in('consultor_id', ids),
      ]);

      // Build count maps
      const leadsCountMap = new Map<string, number>();
      const associadosCountMap = new Map<string, number>();
      
      (leadsData.data || []).forEach(l => {
        if (l.consultor_id) {
          leadsCountMap.set(l.consultor_id, (leadsCountMap.get(l.consultor_id) || 0) + 1);
        }
      });
      
      (associadosData.data || []).forEach(a => {
        if (a.consultor_id) {
          associadosCountMap.set(a.consultor_id, (associadosCountMap.get(a.consultor_id) || 0) + 1);
        }
      });

      // Map consultores with stats using reference data hook (no N+1)
      const consultoresWithStats = (profilesData || []).map(consultor => ({
        ...consultor,
        leads_count: leadsCountMap.get(consultor.id) || 0,
        associados_count: associadosCountMap.get(consultor.id) || 0,
        regiao_nome: getRegiaoNome(consultor.regiao_id),
        sede_nome: getSedeNome(consultor.sede_id),
      }));

      setConsultores(consultoresWithStats);
    } catch (error) {
      console.error('Error fetching consultores:', error);
      setFetchError('Erro ao carregar consultores. Verifique suas permissões.');
      toast.error('Erro ao carregar consultores');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when access is granted - using refs to avoid infinite loop
  const getRegiaoNomeRef = { current: getRegiaoNome };
  const getSedeNomeRef = { current: getSedeNome };
  getRegiaoNomeRef.current = getRegiaoNome;
  getSedeNomeRef.current = getSedeNome;
  
  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchConsultores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, isChecking]);

  // Show loading while checking access
  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar esta página.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if fetch failed
  if (fetchError && !isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Erro ao Carregar</CardTitle>
              <CardDescription>{fetchError}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => fetchConsultores()}>
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (consultor?: ConsultorWithStats) => {
    setFormErrors({});
    
    if (consultor) {
      setSelectedConsultor(consultor);
      setFormData({
        nome_completo: consultor.nome_completo,
        email: consultor.email,
        telefone: consultor.telefone || '',
        cpf: consultor.cpf || '',
        regiao_id: consultor.regiao_id || '',
        ativo: consultor.ativo,
      });
    } else {
      setSelectedConsultor(null);
      // Set default regiao for Admin Regional
      const defaultRegiaoId = isAdminRegional && !isAdminPrincipal && profile?.regiao_id 
        ? profile.regiao_id 
        : '';
      
      setFormData({
        nome_completo: '',
        email: '',
        telefone: '',
        cpf: '',
        regiao_id: defaultRegiaoId,
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    try {
      consultorSchema.parse(formData);
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

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Corrija os erros do formulário');
      return;
    }

    setIsSaving(true);

    try {
      // Get sede_id from regiao
      const { data: regiaoData } = await supabase
        .from('regioes')
        .select('sede_id')
        .eq('id', formData.regiao_id)
        .single();

      if (!regiaoData) {
        toast.error('Região não encontrada');
        setIsSaving(false);
        return;
      }

      if (selectedConsultor) {
        // Update existing consultor
        const { error } = await supabase
          .from('profiles')
          .update({
            nome_completo: formData.nome_completo.trim(),
            telefone: formData.telefone.trim() || null,
            cpf: formData.cpf.replace(/\D/g, '') || null,
            regiao_id: formData.regiao_id,
            sede_id: regiaoData.sede_id,
            ativo: formData.ativo,
          })
          .eq('id', selectedConsultor.id);

        if (error) throw error;
        toast.success('Consultor atualizado com sucesso');
      } else {
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.email.trim().toLowerCase())
          .maybeSingle();

        if (existingUser) {
          // User exists, add role and update profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              nome_completo: formData.nome_completo.trim(),
              telefone: formData.telefone.trim() || null,
              cpf: formData.cpf.replace(/\D/g, '') || null,
              regiao_id: formData.regiao_id,
              sede_id: regiaoData.sede_id,
              ativo: true,
            })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;

          // Check if already has consultor role
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('role', 'consultor_vendas')
            .maybeSingle();

          if (!existingRole) {
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: existingUser.id,
                role: 'consultor_vendas',
              });

            if (roleError) throw roleError;
          }

          toast.success('Consultor vinculado com sucesso');
        } else {
          // Create new user via edge function
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (!sessionData.session) {
            toast.error('Sessão expirada. Faça login novamente.');
            setIsSaving(false);
            return;
          }

          const response = await supabase.functions.invoke('create-consultor', {
            body: {
              nome_completo: formData.nome_completo.trim(),
              email: formData.email.trim().toLowerCase(),
              telefone: formData.telefone.trim() || null,
              cpf: formData.cpf.replace(/\D/g, '') || null,
              regiao_id: formData.regiao_id,
              sede_id: regiaoData.sede_id,
              company_id: profile?.company_id,
            },
          });

          if (response.error) {
            console.error('Erro na edge function:', response.error);
            throw new Error(response.error.message || 'Erro ao criar consultor');
          }

          const result = response.data;

          if (!result.success) {
            throw new Error(result.error || 'Erro ao criar consultor');
          }

          if (result.emailSent) {
            toast.success('Consultor criado com sucesso! E-mail com credenciais enviado.');
          } else {
            // Email failed, show temp password
            toast.success(
              `Consultor criado! Senha temporária: ${result.tempPassword}`,
              { duration: 15000 }
            );
            toast.info('Anote a senha acima e informe ao consultor. Ele deverá trocá-la no primeiro acesso.');
          }
        }
      }

      setIsDialogOpen(false);
      fetchConsultores();
    } catch (error: any) {
      console.error('Error saving consultor:', error);
      toast.error(error.message || 'Erro ao salvar consultor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedConsultor) return;

    try {
      // Check for dependencies
      const { count: associadosCount } = await supabase
        .from('associados')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', selectedConsultor.id);

      if (associadosCount && associadosCount > 0) {
        toast.error(`Não é possível desativar. Este consultor possui ${associadosCount} associado(s) vinculado(s).`);
        setIsDeactivateDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', selectedConsultor.id);

      if (error) throw error;

      toast.success('Consultor desativado com sucesso');
      setIsDeactivateDialogOpen(false);
      setSelectedConsultor(null);
      fetchConsultores();
    } catch (error: any) {
      console.error('Error deactivating consultor:', error);
      toast.error(error.message || 'Erro ao desativar consultor');
    }
  };

  const filteredConsultores = consultores.filter(
    (consultor) =>
      consultor.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultor.regiao_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAssociados = consultores.reduce((acc, c) => acc + (c.associados_count || 0), 0);
  const totalLeads = consultores.reduce((acc, c) => acc + (c.leads_count || 0), 0);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Consultores</h1>
            <p className="text-muted-foreground">
              Gerencie os consultores vinculados à sua regional
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Consultor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Consultores
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{consultores.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {consultores.filter(c => c.ativo).length} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Associados
              </CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAssociados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Consultor
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {consultores.length > 0 
                  ? Math.round(totalAssociados / consultores.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                associados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Consultores</CardTitle>
            <CardDescription>
              Consultores vinculados à regional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar consultor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead>Associados</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : fetchError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-destructive">
                          <Users className="h-8 w-8" />
                          <p>{fetchError}</p>
                          <Button variant="outline" size="sm" onClick={fetchConsultores}>
                            Tentar novamente
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredConsultores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Nenhum consultor encontrado
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConsultores.map((consultor) => (
                      <TableRow key={consultor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {consultor.nome_completo
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{consultor.nome_completo}</p>
                              {consultor.cpf && (
                                <p className="text-sm text-muted-foreground">
                                  CPF: {formatCPF(consultor.cpf)}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {consultor.email}
                            </p>
                            {consultor.telefone && (
                              <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {formatPhone(consultor.telefone)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{consultor.regiao_nome || consultor.sede_nome || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{consultor.associados_count || 0}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{consultor.leads_count || 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={consultor.ativo ? 'default' : 'secondary'}>
                            {consultor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(consultor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
                {selectedConsultor ? 'Editar Consultor' : 'Novo Consultor'}
              </DialogTitle>
              <DialogDescription>
                {selectedConsultor
                  ? 'Atualize os dados do consultor'
                  : 'Cadastre um novo consultor. Será enviado um e-mail com login e senha temporária.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_completo: e.target.value })
                  }
                  placeholder="Nome do consultor"
                  className={formErrors.nome_completo ? 'border-destructive' : ''}
                />
                {formErrors.nome_completo && (
                  <p className="text-sm text-destructive">{formErrors.nome_completo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                  disabled={!!selectedConsultor}
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf: formatCPF(e.target.value) })
                  }
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regiao_id">Região *</Label>
                <Select
                  value={formData.regiao_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, regiao_id: value })
                  }
                >
                  <SelectTrigger className={formErrors.regiao_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    {regioes.map((regiao) => (
                      <SelectItem key={regiao.id} value={regiao.id}>
                        {regiao.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.regiao_id && (
                  <p className="text-sm text-destructive">{formErrors.regiao_id}</p>
                )}
              </div>

              {selectedConsultor && (
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="ativo">Consultor Ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ativo: checked })
                    }
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              {selectedConsultor && selectedConsultor.ativo && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setIsDeactivateDialogOpen(true);
                  }}
                >
                  Desativar
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedConsultor ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  selectedConsultor ? 'Salvar' : 'Criar Consultor'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar consultor?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar o consultor "{selectedConsultor?.nome_completo}"?
                Esta ação não pode ser desfeita facilmente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeactivate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
