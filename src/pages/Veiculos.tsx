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
  Truck
} from 'lucide-react';
import { FipeRangeDetector } from '@/components/FipeRangeDetector';
import type { VehicleType, Cota, Regiao, Profile, Associado } from '@/types/database';
import { vehicleTypeLabels } from '@/types/database';

interface VeiculoWithDetails {
  id: string;
  tipo: VehicleType;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  valor_fipe: number;
  cota_id: string | null;
  mensalidade: number;
  protecao_ativa: boolean;
  protecao_ativada_em: string | null;
  carro_reserva_dias: number;
  carro_reserva_adicional: number | null;
  created_at: string;
  associado_id: string;
  associado?: Associado | null;
  cota?: Cota | null;
  regiao?: Regiao | null;
  consultor?: Profile | null;
}

export default function Veiculos() {
  const { user, profile, isAdminPrincipal, hasRole } = useAuth();
  // Consultor or above can access - they see only their own associados' vehicles
  const { isAllowed, isChecking } = useAccessControl('consultor_or_above');
  
  const [veiculos, setVeiculos] = useState<VeiculoWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook centralizado para dados de referência
  const { regioes, cotas, consultores, getRegiaoNome, getCotaNome, getConsultorNome } = useReferenceData({
    loadRegioes: true,
    loadCotas: true,
    loadConsultores: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [cotaFilter, setCotaFilter] = useState<string>('all');
  const [protecaoFilter, setProtecaoFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoWithDetails | null>(null);
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    placa: '',
    valor_fipe: 0,
    tipo: 'carro' as VehicleType,
    protecao_ativa: false,
  });

  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !isAdminRegional;
  const isCadastro = hasRole('cadastro');
  const canEdit = isAdminPrincipal || isAdminRegional || isCadastro;

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

  useEffect(() => {
    fetchVeiculos();
  }, [regioes, cotas, consultores]);

  const fetchVeiculos = async () => {
    setIsLoading(true);
    try {
      // Get associados based on user's access level
      let associadosQuery = supabase.from('associados').select('*');
      
      if (isConsultor && user?.id) {
        associadosQuery = associadosQuery.eq('consultor_id', user.id);
      } else if (isAdminRegional && profile?.sede_id) {
        const { data: sedeRegioes } = await supabase
          .from('regioes')
          .select('id')
          .eq('sede_id', profile.sede_id);
        
        if (sedeRegioes && sedeRegioes.length > 0) {
          associadosQuery = associadosQuery.in('regiao_id', sedeRegioes.map(r => r.id));
        }
      }

      const { data: associadosData, error: associadosError } = await associadosQuery;
      if (associadosError) throw associadosError;

      const associadoIds = associadosData?.map(a => a.id) || [];
      
      if (associadoIds.length === 0) {
        setVeiculos([]);
        setIsLoading(false);
        return;
      }

      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('*')
        .in('associado_id', associadoIds)
        .order('created_at', { ascending: false });

      if (veiculosError) throw veiculosError;

      // Map veiculos with details using reference data hook (no N+1)
      const veiculosWithDetails = (veiculosData || []).map(veiculo => {
        const associado = associadosData?.find(a => a.id === veiculo.associado_id);
        const cota = cotas.find(c => c.id === veiculo.cota_id) || null;
        const regiao = regioes.find(r => r.id === associado?.regiao_id) || null;
        const consultor = consultores.find(c => c.id === associado?.consultor_id) || null;

        return {
          ...veiculo,
          tipo: veiculo.tipo as VehicleType,
          associado: associado ? { ...associado, status: associado.status as any } : null,
          cota,
          regiao,
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
  };

  const handleOpenEditDialog = (veiculo: VeiculoWithDetails) => {
    setSelectedVeiculo(veiculo);
    setFormData({
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      placa: veiculo.placa,
      valor_fipe: veiculo.valor_fipe,
      tipo: veiculo.tipo,
      protecao_ativa: veiculo.protecao_ativa,
    });
    setIsDialogOpen(true);
  };

  const handleSaveVeiculo = async () => {
    if (!selectedVeiculo) return;

    // Validations
    if (!formData.marca.trim() || !formData.modelo.trim() || !formData.placa.trim() || formData.valor_fipe <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Placa validation
    const placaLimpa = formData.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const placaValida = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaLimpa);
    if (!placaValida) {
      toast.error('Placa inválida. Use o formato ABC1234 ou ABC1D23 (Mercosul)');
      return;
    }

    // Find appropriate cota
    const cotaApropriada = cotas.find(
      c => formData.valor_fipe >= c.fipe_min && formData.valor_fipe <= c.fipe_max && c.ativo
    );

    // Calculate mensalidade
    let mensalidade = 0;
    if (cotaApropriada) {
      switch (formData.tipo) {
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

    try {
      const updateData: any = {
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        ano: formData.ano,
        placa: placaLimpa,
        valor_fipe: formData.valor_fipe,
        tipo: formData.tipo,
        cota_id: cotaApropriada?.id || null,
        mensalidade,
        protecao_ativa: formData.protecao_ativa,
      };

      // Set protecao_ativada_em if activating protection
      if (formData.protecao_ativa && !selectedVeiculo.protecao_ativa) {
        updateData.protecao_ativada_em = new Date().toISOString();
      } else if (!formData.protecao_ativa) {
        updateData.protecao_ativada_em = null;
      }

      const { error } = await supabase
        .from('veiculos')
        .update(updateData)
        .eq('id', selectedVeiculo.id);

      if (error) throw error;
      toast.success('Veículo atualizado com sucesso');
      setIsDialogOpen(false);
      fetchVeiculos();
    } catch (error: any) {
      console.error('Error saving veiculo:', error);
      toast.error(error.message || 'Erro ao salvar veículo');
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
        return <Truck className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const filteredVeiculos = veiculos.filter((veiculo) => {
    const matchesSearch =
      veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.associado?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = tipoFilter === 'all' || veiculo.tipo === tipoFilter;
    const matchesCota = cotaFilter === 'all' || veiculo.cota_id === cotaFilter;
    const matchesProtecao = 
      protecaoFilter === 'all' || 
      (protecaoFilter === 'ativa' && veiculo.protecao_ativa) ||
      (protecaoFilter === 'inativa' && !veiculo.protecao_ativa);

    return matchesSearch && matchesTipo && matchesCota && matchesProtecao;
  });

  // Group by regiao -> cota
  const groupedByRegiao = regioes.reduce((acc, regiao) => {
    const regiaoVeiculos = filteredVeiculos.filter(v => v.regiao?.id === regiao.id);
    if (regiaoVeiculos.length > 0) {
      const byCota = cotas.reduce((cAcc, cota) => {
        const cotaVeiculos = regiaoVeiculos.filter(v => v.cota_id === cota.id);
        if (cotaVeiculos.length > 0) {
          cAcc[cota.id] = { cota, veiculos: cotaVeiculos };
        }
        return cAcc;
      }, {} as Record<string, { cota: Cota; veiculos: VeiculoWithDetails[] }>);

      // Vehicles without cota
      const semCota = regiaoVeiculos.filter(v => !v.cota_id);
      if (semCota.length > 0) {
        byCota['sem_cota'] = { cota: null as any, veiculos: semCota };
      }

      acc[regiao.id] = { regiao, veiculos: regiaoVeiculos, byCota };
    }
    return acc;
  }, {} as Record<string, { regiao: Regiao; veiculos: VeiculoWithDetails[]; byCota: Record<string, { cota: Cota | null; veiculos: VeiculoWithDetails[] }> }>);

  const stats = {
    total: veiculos.length,
    ativos: veiculos.filter(v => v.protecao_ativa).length,
    carros: veiculos.filter(v => v.tipo === 'carro').length,
    motos: veiculos.filter(v => v.tipo === 'moto').length,
    pickups: veiculos.filter(v => v.tipo === 'pickup').length,
    faturamento: veiculos.filter(v => v.protecao_ativa).reduce((acc, v) => acc + (v.mensalidade || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Veículos</h1>
            <p className="text-muted-foreground">
              Gerencie os veículos protegidos e suas faixas FIPE
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <Car className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Protegidos
              </CardTitle>
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.ativos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Carros
              </CardTitle>
              <Car className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.carros}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Motos
              </CardTitle>
              <Bike className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.motos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pickups
              </CardTitle>
              <Truck className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pickups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.faturamento)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">mensal</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Veículos</CardTitle>
                <CardDescription>
                  Todos os veículos cadastrados com enquadramento automático na faixa FIPE
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, marca, modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cotaFilter} onValueChange={setCotaFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Faixa FIPE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cotas.map((cota) => (
                    <SelectItem key={cota.id} value={cota.id}>
                      {cota.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={protecaoFilter} onValueChange={setProtecaoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Proteção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativa">Protegidos</SelectItem>
                  <SelectItem value="inativa">Sem proteção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>Valor FIPE</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead>Proteção</TableHead>
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
                    ) : filteredVeiculos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Car className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              Nenhum veículo encontrado
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVeiculos.map((veiculo) => (
                        <TableRow key={veiculo.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                {getVehicleIcon(veiculo.tipo)}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {veiculo.marca} {veiculo.modelo}
                                </p>
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
                              <p className="font-medium text-sm">
                                {veiculo.associado?.nome_completo || '-'}
                              </p>
                              {veiculo.regiao && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {veiculo.regiao.nome}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {formatCurrency(veiculo.valor_fipe)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {veiculo.cota ? (
                              <Badge variant="outline">{veiculo.cota.nome}</Badge>
                            ) : (
                              <Badge variant="destructive">Sem faixa</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatCurrency(veiculo.mensalidade)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {veiculo.protecao_ativa ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-600">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Ativa
                                </Badge>
                                {veiculo.protecao_ativada_em && (
                                  <span className="text-xs text-muted-foreground">
                                    desde {formatDate(veiculo.protecao_ativada_em)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary">
                                <ShieldX className="h-3 w-3 mr-1" />
                                Inativa
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditDialog(veiculo)}
                              >
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
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(groupedByRegiao).length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum veículo encontrado</p>
                  </div>
                ) : (
                  Object.entries(groupedByRegiao).map(([regiaoId, { regiao, veiculos: regiaoVeiculos, byCota }]) => (
                    <AccordionItem key={regiaoId} value={regiaoId} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{regiao.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {regiaoVeiculos.length} veículo(s) • {formatCurrency(regiaoVeiculos.filter(v => v.protecao_ativa).reduce((acc, v) => acc + v.mensalidade, 0))}/mês
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="multiple" className="ml-4">
                          {Object.entries(byCota).map(([cotaId, { cota, veiculos: cotaVeiculos }]) => (
                            <AccordionItem key={cotaId} value={cotaId} className="border-l-2 border-muted pl-4">
                              <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {cota ? cota.nome : 'Sem faixa definida'}
                                  </span>
                                  <Badge variant="secondary" className="ml-2">
                                    {cotaVeiculos.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 mt-2">
                                  {cotaVeiculos.map((veiculo) => (
                                    <div
                                      key={veiculo.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-lg">
                                          {getVehicleIcon(veiculo.tipo)}
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">
                                            {veiculo.marca} {veiculo.modelo}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {veiculo.placa} • {veiculo.associado?.nome_completo}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                          {formatCurrency(veiculo.mensalidade)}
                                        </span>
                                        {veiculo.protecao_ativa ? (
                                          <ShieldCheck className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ShieldX className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        {canEdit && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleOpenEditDialog(veiculo)}
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

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Veículo</DialogTitle>
              <DialogDescription>
                Atualize os dados do veículo. A faixa FIPE será recalculada automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Veículo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: VehicleType) =>
                    setFormData({ ...formData, tipo: value })
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
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Ex: Volkswagen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="Ex: Gol"
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
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC1234"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor FIPE *</Label>
                <Input
                  type="number"
                  value={formData.valor_fipe || ''}
                  onChange={(e) => setFormData({ ...formData, valor_fipe: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 45000"
                />
              </div>

              <FipeRangeDetector
                valorFipe={formData.valor_fipe}
                tipoVeiculo={formData.tipo}
                cotas={cotas.filter(c => c.ativo)}
              />

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <Label>Proteção Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Ativa a cobertura de proteção veicular
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.protecao_ativa ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Button
                    variant={formData.protecao_ativa ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, protecao_ativa: !formData.protecao_ativa })}
                  >
                    {formData.protecao_ativa ? 'Ativa' : 'Inativa'}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVeiculo}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
