import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
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
  MapPin,
  Car,
  Eye,
  Building2,
  Plus
} from 'lucide-react';
import type { Associado, Regiao, AssociateStatus, VehicleType, Cota, Profile } from '@/types/database';
import { associateStatusLabels, vehicleTypeLabels } from '@/types/database';

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
  cor: string;
  chassi: string;
  renavam: string;
  valor_fipe: number;
  cota_id: string;
}

export default function Associados() {
  // Access control: Consultor, Admin Regional, or Admin Principal
  const { isAllowed, isChecking } = useAccessControl('consultor_or_above');
  const { user, profile, isAdminPrincipal, hasRole } = useAuth();
  const [associados, setAssociados] = useState<AssociadoWithDetails[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [consultores, setConsultores] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regiaoFilter, setRegiaoFilter] = useState<string>('all');
  const [consultorFilter, setConsultorFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVeiculoDialogOpen, setIsVeiculoDialogOpen] = useState(false);
  const [selectedAssociado, setSelectedAssociado] = useState<AssociadoWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    regiao_id: '',
    status: 'ativo' as AssociateStatus,
  });

  const [veiculoForm, setVeiculoForm] = useState<VeiculoForm>({
    tipo: 'carro',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    placa: '',
    cor: '',
    chassi: '',
    renavam: '',
    valor_fipe: 0,
    cota_id: '',
  });

  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !hasRole('admin_regional');
  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isCadastro = hasRole('cadastro');
  
  // Consultores can only create (not edit other's associados)
  // Admin Regional and Admin Principal can edit anyone in their scope
  const canCreate = isConsultor || isAdminRegional || isAdminPrincipal;
  const canEditAll = isAdminPrincipal || isAdminRegional || isCadastro;

  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchData();
    }
  }, [user?.id, isAdminPrincipal, isConsultor, isAllowed, isChecking]);

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

  const fetchData = async () => {
    await Promise.all([
      fetchAssociados(),
      fetchRegioes(),
      fetchCotas(),
      fetchConsultores(),
    ]);
  };

  const fetchAssociados = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('associados').select('*');

      // Filter based on role
      if (isConsultor && !isAdminPrincipal && !isAdminRegional) {
        query = query.eq('consultor_id', user!.id);
      } else if (isAdminRegional && profile?.sede_id) {
        // Get regioes for this sede
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

      // Get additional details for each associado
      const associadosWithDetails = await Promise.all(
        (data || []).map(async (associado) => {
          // Get veiculos count
          const { count } = await supabase
            .from('veiculos')
            .select('*', { count: 'exact', head: true })
            .eq('associado_id', associado.id);

          // Get consultor info
          let consultor: Profile | null = null;
          if (associado.consultor_id) {
            const { data: consultorData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', associado.consultor_id)
              .maybeSingle();
            consultor = consultorData;
          }

          // Get regiao info
          let regiao: Regiao | null = null;
          if (associado.regiao_id) {
            const { data: regiaoData } = await supabase
              .from('regioes')
              .select('*')
              .eq('id', associado.regiao_id)
              .maybeSingle();
            if (regiaoData) {
              regiao = { ...regiaoData, ativo: regiaoData.ativo };
            }
          }

          return {
            ...associado,
            status: associado.status as AssociateStatus,
            veiculos_count: count || 0,
            consultor,
            regiao,
          };
        })
      );

      setAssociados(associadosWithDetails);
    } catch (error) {
      console.error('Error fetching associados:', error);
      toast.error('Erro ao carregar associados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegioes = async () => {
    try {
      const { data, error } = await supabase
        .from('regioes')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setRegioes(data || []);
    } catch (error) {
      console.error('Error fetching regioes:', error);
    }
  };

  const fetchCotas = async () => {
    try {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCotas((data || []).map(c => ({
        ...c,
        fipe_min: Number(c.fipe_min),
        fipe_max: Number(c.fipe_max),
        mensalidade_carro: Number(c.mensalidade_carro),
        mensalidade_moto: Number(c.mensalidade_moto),
        mensalidade_pickup: Number(c.mensalidade_pickup),
      })));
    } catch (error) {
      console.error('Error fetching cotas:', error);
    }
  };

  const fetchConsultores = async () => {
    try {
      // Get all users with consultor_vendas role
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor_vendas');

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', rolesData.map(r => r.user_id))
          .order('nome_completo');

        if (profilesError) throw profilesError;
        setConsultores(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const handleOpenDialog = (associado?: AssociadoWithDetails) => {
    if (associado) {
      setSelectedAssociado(associado);
      setFormData({
        nome_completo: associado.nome_completo,
        cpf: associado.cpf,
        rg: associado.rg || '',
        data_nascimento: associado.data_nascimento || '',
        telefone: associado.telefone,
        email: associado.email,
        endereco: associado.endereco || '',
        cidade: associado.cidade || '',
        estado: associado.estado || '',
        cep: associado.cep || '',
        regiao_id: associado.regiao_id || '',
        status: associado.status,
      });
    } else {
      setSelectedAssociado(null);
      setFormData({
        nome_completo: '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        regiao_id: profile?.regiao_id || '',
        status: 'ativo',
      });
    }
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
      cor: '',
      chassi: '',
      renavam: '',
      valor_fipe: 0,
      cota_id: '',
    });
    setIsVeiculoDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_completo.trim() || !formData.cpf.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Get consultor's regiao automatically
      let regiaoId = formData.regiao_id;
      if (!regiaoId && profile?.regiao_id) {
        regiaoId = profile.regiao_id;
      }

      const associadoData = {
        nome_completo: formData.nome_completo.trim(),
        cpf: formData.cpf.trim(),
        rg: formData.rg.trim() || null,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        endereco: formData.endereco.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || null,
        cep: formData.cep.trim() || null,
        regiao_id: regiaoId || null,
        status: formData.status,
      };

      if (selectedAssociado) {
        const { error } = await supabase
          .from('associados')
          .update(associadoData)
          .eq('id', selectedAssociado.id);

        if (error) throw error;
        toast.success('Associado atualizado com sucesso');
      } else {
        // Create new associado linked to current consultor
        const { error } = await supabase
          .from('associados')
          .insert({
            ...associadoData,
            consultor_id: user!.id,
          });

        if (error) throw error;
        toast.success('Associado cadastrado com sucesso');
      }

      setIsDialogOpen(false);
      fetchAssociados();
    } catch (error: any) {
      console.error('Error saving associado:', error);
      toast.error(error.message || 'Erro ao salvar associado');
    }
  };

  const handleSaveVeiculo = async () => {
    if (!selectedAssociado) return;

    if (!veiculoForm.marca.trim() || !veiculoForm.modelo.trim() || !veiculoForm.placa.trim() || veiculoForm.valor_fipe <= 0) {
      toast.error('Preencha todos os campos obrigatórios do veículo');
      return;
    }

    try {
      // Find appropriate cota based on FIPE value
      const cotaApropriada = cotas.find(
        c => veiculoForm.valor_fipe >= c.fipe_min && veiculoForm.valor_fipe <= c.fipe_max
      );

      // Calculate mensalidade based on vehicle type
      let mensalidade = 0;
      if (cotaApropriada) {
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
      }

      const { error } = await supabase
        .from('veiculos')
        .insert({
          associado_id: selectedAssociado.id,
          tipo: veiculoForm.tipo,
          marca: veiculoForm.marca.trim(),
          modelo: veiculoForm.modelo.trim(),
          ano: veiculoForm.ano,
          placa: veiculoForm.placa.trim().toUpperCase(),
          cor: veiculoForm.cor.trim() || null,
          chassi: veiculoForm.chassi.trim() || null,
          renavam: veiculoForm.renavam.trim() || null,
          valor_fipe: veiculoForm.valor_fipe,
          cota_id: veiculoForm.cota_id || cotaApropriada?.id || null,
          mensalidade: mensalidade,
          carro_reserva_dias: 15,
        });

      if (error) throw error;

      toast.success('Veículo cadastrado com sucesso');
      setIsVeiculoDialogOpen(false);
      fetchAssociados();
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

  // Group associados by regiao and consultor
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
    // Consultor can edit their own associados
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
                onClick={() => handleOpenDialog(associado)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

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
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Associado
            </Button>
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
                                onClick={() => handleOpenDialog()}
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
                                            onClick={() => handleOpenDialog(associado)}
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

        {/* Create/Edit Associado Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAssociado ? 'Editar Associado' : 'Novo Associado'}
              </DialogTitle>
              <DialogDescription>
                {selectedAssociado
                  ? 'Atualize os dados do associado'
                  : 'Cadastre um novo associado vinculado automaticamente à sua regional'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Personal Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Dados Pessoais</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome_completo}
                      onChange={(e) =>
                        setFormData({ ...formData, nome_completo: e.target.value })
                      }
                      placeholder="Nome completo do associado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF / Documento *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) =>
                        setFormData({ ...formData, rg: e.target.value })
                      }
                      placeholder="00.000.000-0"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Contato</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Endereço (opcional)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) =>
                        setFormData({ ...formData, endereco: e.target.value })
                      }
                      placeholder="Rua, número, bairro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) =>
                        setFormData({ ...formData, cidade: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estado">UF</Label>
                      <Input
                        id="estado"
                        value={formData.estado}
                        onChange={(e) =>
                          setFormData({ ...formData, estado: e.target.value })
                        }
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={formData.cep}
                        onChange={(e) =>
                          setFormData({ ...formData, cep: e.target.value })
                        }
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status (only for admins, not consultores) */}
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {selectedAssociado ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Veiculo Dialog */}
        <Dialog open={isVeiculoDialogOpen} onOpenChange={setIsVeiculoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Veículo</DialogTitle>
              <DialogDescription>
                Vincule um veículo ao associado {selectedAssociado?.nome_completo}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
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
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input
                    type="number"
                    value={veiculoForm.ano}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, ano: parseInt(e.target.value) || 0 })
                    }
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={veiculoForm.marca}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, marca: e.target.value })
                    }
                    placeholder="Ex: Volkswagen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={veiculoForm.modelo}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, modelo: e.target.value })
                    }
                    placeholder="Ex: Gol"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={veiculoForm.placa}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })
                    }
                    placeholder="ABC1234"
                    maxLength={7}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={veiculoForm.cor}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, cor: e.target.value })
                    }
                    placeholder="Ex: Prata"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor FIPE *</Label>
                <Input
                  type="number"
                  value={veiculoForm.valor_fipe || ''}
                  onChange={(e) =>
                    setVeiculoForm({ ...veiculoForm, valor_fipe: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Ex: 45000"
                />
                <p className="text-xs text-muted-foreground">
                  A cota será calculada automaticamente com base no valor FIPE
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input
                    value={veiculoForm.chassi}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, chassi: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renavam</Label>
                  <Input
                    value={veiculoForm.renavam}
                    onChange={(e) =>
                      setVeiculoForm({ ...veiculoForm, renavam: e.target.value })
                    }
                  />
                </div>
              </div>
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
