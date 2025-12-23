import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
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
  Building2, 
  TrendingUp, 
  FileText, 
  Car,
  Search,
  Edit,
  Phone,
  Mail,
  Calendar,
  UserCheck
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Profile, Sede, AppRole } from '@/types/database';

interface ConsultorWithStats extends Profile {
  leads_count?: number;
  associados_count?: number;
}

interface RegionalStats {
  totalConsultores: number;
  totalAssociados: number;
  totalVeiculos: number;
  propostasMes: number;
  conversaoMes: number;
}

interface GrowthData {
  month: string;
  associados: number;
}

interface RecentAssociado {
  id: string;
  nome_completo: string;
  created_at: string;
  status: string;
}

export default function RegionalDashboard() {
  const { profile, hasRole, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('admin_regional_or_above');
  const [sede, setSede] = useState<Sede | null>(null);
  const [consultores, setConsultores] = useState<ConsultorWithStats[]>([]);
  const [stats, setStats] = useState<RegionalStats>({
    totalConsultores: 0,
    totalAssociados: 0,
    totalVeiculos: 0,
    propostasMes: 0,
    conversaoMes: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [recentAssociados, setRecentAssociados] = useState<RecentAssociado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState<ConsultorWithStats | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    ativo: true,
  });

  const isAdminRegional = hasRole('admin_regional') || isAdminPrincipal;

  useEffect(() => {
    if (profile?.sede_id) {
      fetchSedeData();
      fetchConsultores();
      fetchStats();
      fetchGrowthData();
      fetchRecentAssociados();
    }
  }, [profile?.sede_id]);

  const fetchSedeData = async () => {
    if (!profile?.sede_id) return;

    try {
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', profile.sede_id)
        .single();

      if (error) throw error;
      setSede({
        ...data,
        tipo: data.tipo as 'matriz' | 'regional',
      });
    } catch (error) {
      console.error('Error fetching sede:', error);
    }
  };

  const fetchConsultores = async () => {
    if (!profile?.sede_id) return;

    try {
      setIsLoading(true);
      
      // Get users with consultor_vendas role in this sede
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('sede_id', profile.sede_id)
        .order('nome_completo');

      if (error) throw error;

      // Filter only consultores (those with consultor_vendas role)
      const consultoresWithStats = await Promise.all(
        (profilesData || []).map(async (consultor) => {
          // Check if has consultor_vendas role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', consultor.id);

          const isConsultor = roles?.some(r => r.role === 'consultor_vendas');
          if (!isConsultor) return null;

          // Get leads count
          const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('consultor_id', consultor.id);

          // Get associados count
          const { count: associadosCount } = await supabase
            .from('associados')
            .select('*', { count: 'exact', head: true })
            .eq('consultor_id', consultor.id);

          return {
            ...consultor,
            leads_count: leadsCount || 0,
            associados_count: associadosCount || 0,
          };
        })
      );

      setConsultores(consultoresWithStats.filter(Boolean) as ConsultorWithStats[]);
    } catch (error) {
      console.error('Error fetching consultores:', error);
      toast.error('Erro ao carregar consultores');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!profile?.sede_id) return;

    try {
      // Get regioes for this sede
      const { data: regioes } = await supabase
        .from('regioes')
        .select('id')
        .eq('sede_id', profile.sede_id);

      const regiaoIds = regioes?.map(r => r.id) || [];

      // Get consultores count
      const { count: consultoresCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', profile.sede_id);

      // Get associados count
      let associadosCount = 0;
      if (regiaoIds.length > 0) {
        const { count } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .in('regiao_id', regiaoIds);
        associadosCount = count || 0;
      }

      // Get veiculos count (via associados)
      let veiculosCount = 0;
      if (regiaoIds.length > 0) {
        const { data: associados } = await supabase
          .from('associados')
          .select('id')
          .in('regiao_id', regiaoIds);
        
        if (associados && associados.length > 0) {
          const { count } = await supabase
            .from('veiculos')
            .select('*', { count: 'exact', head: true })
            .in('associado_id', associados.map(a => a.id));
          veiculosCount = count || 0;
        }
      }

      // Get propostas do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: consultoresData } = await supabase
        .from('profiles')
        .select('id')
        .eq('sede_id', profile.sede_id);

      let propostasMes = 0;
      if (consultoresData && consultoresData.length > 0) {
        const { count } = await supabase
          .from('propostas')
          .select('*', { count: 'exact', head: true })
          .in('consultor_id', consultoresData.map(c => c.id))
          .gte('created_at', startOfMonth.toISOString());
        propostasMes = count || 0;
      }

      setStats({
        totalConsultores: consultoresCount || 0,
        totalAssociados: associadosCount,
        totalVeiculos: veiculosCount,
        propostasMes,
        conversaoMes: 0, // To be calculated
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGrowthData = async () => {
    if (!profile?.sede_id) return;

    try {
      // Get regioes for this sede
      const { data: regioes } = await supabase
        .from('regioes')
        .select('id')
        .eq('sede_id', profile.sede_id);

      const regiaoIds = regioes?.map(r => r.id) || [];
      if (regiaoIds.length === 0) {
        setGrowthData([]);
        return;
      }

      // Fetch growth data (last 6 months)
      const months: GrowthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const end = endOfMonth(date);

        const { count } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .in('regiao_id', regiaoIds)
          .lte('created_at', end.toISOString());

        months.push({
          month: format(date, 'MMM', { locale: ptBR }),
          associados: count || 0,
        });
      }
      setGrowthData(months);
    } catch (error) {
      console.error('Error fetching growth data:', error);
    }
  };

  const fetchRecentAssociados = async () => {
    if (!profile?.sede_id) return;

    try {
      // Get regioes for this sede
      const { data: regioes } = await supabase
        .from('regioes')
        .select('id')
        .eq('sede_id', profile.sede_id);

      const regiaoIds = regioes?.map(r => r.id) || [];
      if (regiaoIds.length === 0) {
        setRecentAssociados([]);
        return;
      }

      const { data } = await supabase
        .from('associados')
        .select('id, nome_completo, created_at, status')
        .in('regiao_id', regiaoIds)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentAssociados(data || []);
    } catch (error) {
      console.error('Error fetching recent associados:', error);
    }
  };

  const handleOpenDialog = (consultor?: ConsultorWithStats) => {
    if (consultor) {
      setSelectedConsultor(consultor);
      setFormData({
        nome_completo: consultor.nome_completo,
        email: consultor.email,
        telefone: consultor.telefone || '',
        cpf: consultor.cpf || '',
        ativo: consultor.ativo,
      });
    } else {
      setSelectedConsultor(null);
      setFormData({
        nome_completo: '',
        email: '',
        telefone: '',
        cpf: '',
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveConsultor = async () => {
    if (!formData.nome_completo.trim() || !formData.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    try {
      if (selectedConsultor) {
        // Update existing consultor
        const { error } = await supabase
          .from('profiles')
          .update({
            nome_completo: formData.nome_completo.trim(),
            telefone: formData.telefone.trim() || null,
            cpf: formData.cpf.trim() || null,
            ativo: formData.ativo,
          })
          .eq('id', selectedConsultor.id);

        if (error) throw error;
        toast.success('Consultor atualizado com sucesso');
      } else {
        // Create new user via Supabase Auth
        // Note: In a real app, you'd send an invite or use admin functions
        toast.info('Para criar um novo consultor, o usuário deve se cadastrar e você poderá atribuir a permissão.');
      }

      setIsDialogOpen(false);
      fetchConsultores();
    } catch (error: any) {
      console.error('Error saving consultor:', error);
      toast.error(error.message || 'Erro ao salvar consultor');
    }
  };

  const filteredConsultores = consultores.filter(
    (consultor) =>
      consultor.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {sede?.nome || 'Painel Regional'}
                </h1>
                <p className="text-muted-foreground">
                  Gerencie sua regional e consultores
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="w-fit">
            Admin Regional
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consultores
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalConsultores}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ativos na regional
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Associados
              </CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAssociados}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total da regional
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Veículos Protegidos
              </CardTitle>
              <Car className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalVeiculos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Propostas (Mês)
              </CardTitle>
              <FileText className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.propostasMes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="consultores" className="space-y-4">
          <TabsList>
            <TabsTrigger value="consultores">Consultores</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          </TabsList>

          <TabsContent value="consultores">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Consultores da Regional</CardTitle>
                    <CardDescription>
                      Gerencie os consultores vinculados à sua regional
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog()}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Novo Consultor
                  </Button>
                </div>
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
                        <TableHead>Leads</TableHead>
                        <TableHead>Associados</TableHead>
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
                      ) : filteredConsultores.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Nenhum consultor encontrado
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
                                    {consultor.telefone}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{consultor.leads_count || 0}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{consultor.associados_count || 0}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={consultor.ativo ? 'default' : 'secondary'}>
                                {consultor.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(consultor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorio">
            <div className="space-y-6">
              {/* Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Evolução de Associados
                  </CardTitle>
                  <CardDescription>
                    Crescimento nos últimos 6 meses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {growthData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados disponíveis
                    </div>
                  ) : (
                    <ChartContainer config={{ associados: { label: "Associados", color: "hsl(var(--primary))" } }} className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAssociadosRegional" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="month" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="associados"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAssociadosRegional)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Associados */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Últimos Associados
                    </CardTitle>
                    <CardDescription>
                      Cadastrados recentemente na regional
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentAssociados.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum associado cadastrado
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentAssociados.map((associado) => (
                          <div
                            key={associado.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-500/10 rounded-md">
                                <Users className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <span className="font-medium">{associado.nome_completo}</span>
                                <Badge variant={associado.status === 'ativo' ? 'default' : 'secondary'} className="ml-2 text-xs">
                                  {associado.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(associado.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consultores List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      Consultores da Regional
                    </CardTitle>
                    <CardDescription>Por número de associados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {consultores
                        .sort((a, b) => (b.associados_count || 0) - (a.associados_count || 0))
                        .slice(0, 5)
                        .map((consultor, index) => (
                          <div 
                            key={consultor.id} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{consultor.nome_completo}</span>
                            </div>
                            <Badge variant="secondary">
                              {consultor.associados_count || 0} associados
                            </Badge>
                          </div>
                        ))}
                      {consultores.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum consultor cadastrado
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{stats.totalConsultores}</p>
                      <p className="text-xs text-muted-foreground">Consultores</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{stats.totalAssociados}</p>
                      <p className="text-xs text-muted-foreground">Associados</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{stats.totalVeiculos}</p>
                      <p className="text-xs text-muted-foreground">Veículos</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{stats.propostasMes}</p>
                      <p className="text-xs text-muted-foreground">Propostas/Mês</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">
                        {stats.totalConsultores > 0
                          ? (stats.totalAssociados / stats.totalConsultores).toFixed(1)
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Média/Consultor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Consultor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedConsultor ? 'Editar Consultor' : 'Novo Consultor'}
              </DialogTitle>
              <DialogDescription>
                {selectedConsultor
                  ? 'Atualize os dados do consultor'
                  : 'Para adicionar um novo consultor, o usuário deve se cadastrar no sistema primeiro'}
              </DialogDescription>
            </DialogHeader>

            {selectedConsultor ? (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={formData.nome_completo}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_completo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Consultor Ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ativo: checked })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-muted-foreground">
                  Para vincular um novo consultor à sua regional:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>O usuário deve criar uma conta no sistema</li>
                  <li>Acesse a página de Usuários para vincular à sua regional</li>
                  <li>Atribua a permissão de "Consultor de Vendas"</li>
                </ol>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {selectedConsultor ? 'Cancelar' : 'Fechar'}
              </Button>
              {selectedConsultor && (
                <Button onClick={handleSaveConsultor}>Salvar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
