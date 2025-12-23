import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Eye
} from 'lucide-react';
import type { Associado, Regiao, AssociateStatus } from '@/types/database';
import { associateStatusLabels } from '@/types/database';

interface AssociadoWithVeiculos extends Associado {
  veiculos_count?: number;
}

export default function Associados() {
  const { user, profile, roles, isAdminPrincipal, hasRole } = useAuth();
  const navigate = useNavigate();
  const [associados, setAssociados] = useState<AssociadoWithVeiculos[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssociado, setSelectedAssociado] = useState<AssociadoWithVeiculos | null>(null);
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

  const isConsultor = hasRole('consultor_vendas');
  const isAdminRegional = hasRole('admin_regional');
  const isCadastro = hasRole('cadastro');
  const canCreate = isConsultor || isAdminPrincipal || isAdminRegional || isCadastro;
  const canEdit = isAdminPrincipal || isAdminRegional || isCadastro;

  useEffect(() => {
    fetchAssociados();
    fetchRegioes();
  }, [user?.id, isAdminPrincipal, isConsultor]);

  const fetchAssociados = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('associados').select('*');

      // Filter based on role
      if (isConsultor && !isAdminPrincipal && !isAdminRegional) {
        query = query.eq('consultor_id', user!.id);
      } else if (isAdminRegional && profile?.regiao_id) {
        query = query.eq('regiao_id', profile.regiao_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get veiculos count for each associado
      const associadosWithVeiculos = await Promise.all(
        (data || []).map(async (associado) => {
          const { count } = await supabase
            .from('veiculos')
            .select('*', { count: 'exact', head: true })
            .eq('associado_id', associado.id);

          return {
            ...associado,
            status: associado.status as AssociateStatus,
            veiculos_count: count || 0,
          };
        })
      );

      setAssociados(associadosWithVeiculos);
    } catch (error) {
      console.error('Error fetching associados:', error);
      toast.error('Erro ao carregar associados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegioes = async () => {
    try {
      let query = supabase.from('regioes').select('*').eq('ativo', true);

      if (isAdminRegional && profile?.sede_id) {
        query = query.eq('sede_id', profile.sede_id);
      }

      const { data, error } = await query.order('nome');

      if (error) throw error;
      setRegioes(data || []);
    } catch (error) {
      console.error('Error fetching regioes:', error);
    }
  };

  const handleOpenDialog = (associado?: AssociadoWithVeiculos) => {
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

  const handleSave = async () => {
    if (!formData.nome_completo.trim() || !formData.cpf.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
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
        regiao_id: formData.regiao_id || null,
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

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: associados.length,
    ativos: associados.filter(a => a.status === 'ativo').length,
    inadimplentes: associados.filter(a => a.status === 'inadimplente').length,
    suspensos: associados.filter(a => a.status === 'suspenso').length,
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
                Suspensos
              </CardTitle>
              <Users className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.suspensos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Associados</CardTitle>
            <CardDescription>
              Todos os associados cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inadimplente">Inadimplentes</SelectItem>
                  <SelectItem value="suspenso">Suspensos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Veículos</TableHead>
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
                      <TableRow key={associado.id}>
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
                              <p className="text-sm text-muted-foreground">
                                CPF: {associado.cpf}
                              </p>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(associado.status)}>
                            {associateStatusLabels[associado.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(associado.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/associados/${associado.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAssociado ? 'Editar Associado' : 'Novo Associado'}
              </DialogTitle>
              <DialogDescription>
                {selectedAssociado
                  ? 'Atualize os dados do associado'
                  : 'Cadastre um novo associado'}
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
                    <Label htmlFor="cpf">CPF *</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="nascimento">Data de Nascimento</Label>
                    <Input
                      id="nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) =>
                        setFormData({ ...formData, data_nascimento: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regiao">Região</Label>
                    <Select
                      value={formData.regiao_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, regiao_id: value })
                      }
                    >
                      <SelectTrigger>
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
                <h4 className="font-medium text-sm text-muted-foreground">Endereço</h4>
                
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
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      placeholder="UF"
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

                  {canEdit && (
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
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
              </div>
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
      </div>
    </DashboardLayout>
  );
}
