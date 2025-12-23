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
import { format, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Profile, Sede, Regiao } from '@/types/database';

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
  consultor_nome?: string;
}

export default function RegionalDashboard() {
  const { profile, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('admin_regional_or_above');
  
  // Para Admin Principal: seletor de regional
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string | null>(null);
  const [selectedRegiaoId, setSelectedRegiaoId] = useState<string | null>(null);
  
  const [sede, setSede] = useState<Sede | null>(null);
  const [regiao, setRegiao] = useState<Regiao | null>(null);
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

  // Carrega sedes e regiões para Admin Principal
  useEffect(() => {
    if (isAdminPrincipal) {
      fetchSedesAndRegioes();
    } else if (profile?.regiao_id) {
      // Admin Regional usa sua própria região
      setSelectedRegiaoId(profile.regiao_id);
      setSelectedSedeId(profile.sede_id || null);
    }
  }, [isAdminPrincipal, profile]);

  // Carrega dados quando uma região é selecionada
  useEffect(() => {
    if (selectedRegiaoId) {
      fetchAllData();
    }
  }, [selectedRegiaoId]);

  const fetchSedesAndRegioes = async () => {
    try {
      const { data: sedesData } = await supabase
        .from('sedes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      setSedes((sedesData || []).map(s => ({ ...s, tipo: s.tipo as 'matriz' | 'regional' })));

      const { data: regioesData } = await supabase
        .from('regioes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      setRegioes(regioesData || []);
    } catch (error) {
      console.error('Error fetching sedes/regioes:', error);
    }
  };

  const fetchAllData = async () => {
    if (!selectedRegiaoId) return;
    
    setIsLoading(true);
    await Promise.all([
      fetchRegiaoData(),
      fetchConsultores(),
      fetchStats(),
      fetchGrowthData(),
      fetchRecentAssociados(),
    ]);
    setIsLoading(false);
  };

  const fetchRegiaoData = async () => {
    if (!selectedRegiaoId) return;

    try {
      const { data: regiaoData } = await supabase
        .from('regioes')
        .select('*, sedes(*)')
        .eq('id', selectedRegiaoId)
        .single();

      if (regiaoData) {
        setRegiao(regiaoData);
        if (regiaoData.sedes) {
          setSede({
            ...regiaoData.sedes,
            tipo: regiaoData.sedes.tipo as 'matriz' | 'regional',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching regiao:', error);
    }
  };

  const fetchConsultores = async () => {
    if (!selectedRegiaoId) return;

    try {
      // Buscar perfis com regiao_id correspondente
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('regiao_id', selectedRegiaoId)
        .order('nome_completo');

      if (error) throw error;

      // Filtrar apenas consultores (com role consultor_vendas)
      const consultoresWithStats = await Promise.all(
        (profilesData || []).map(async (consultor) => {
          // Verificar role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', consultor.id);

          const isConsultor = roles?.some(r => r.role === 'consultor_vendas');
          if (!isConsultor) return null;

          // Contar leads
          const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('consultor_id', consultor.id);

          // Contar associados
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
    }
  };

  const fetchStats = async () => {
    if (!selectedRegiaoId) return;

    try {
      // Consultores na região
      const { count: consultoresCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('regiao_id', selectedRegiaoId);

      // Associados na região
      const { count: associadosCount } = await supabase
        .from('associados')
        .select('*', { count: 'exact', head: true })
        .eq('regiao_id', selectedRegiaoId);

      // Veículos dos associados da região
      const { data: associadosIds } = await supabase
        .from('associados')
        .select('id')
        .eq('regiao_id', selectedRegiaoId);
      
      let veiculosCount = 0;
      if (associadosIds && associadosIds.length > 0) {
        const { count } = await supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true })
          .in('associado_id', associadosIds.map(a => a.id));
        veiculosCount = count || 0;
      }

      // Propostas do mês (dos consultores da região)
      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const { data: consultoresData } = await supabase
        .from('profiles')
        .select('id')
        .eq('regiao_id', selectedRegiaoId);

      let propostasMes = 0;
      if (consultoresData && consultoresData.length > 0) {
        const { count } = await supabase
          .from('propostas')
          .select('*', { count: 'exact', head: true })
          .in('consultor_id', consultoresData.map(c => c.id))
          .gte('created_at', startOfCurrentMonth.toISOString());
        propostasMes = count || 0;
      }

      setStats({
        totalConsultores: consultoresCount || 0,
        totalAssociados: associadosCount || 0,
        totalVeiculos: veiculosCount,
        propostasMes,
        conversaoMes: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGrowthData = async () => {
    if (!selectedRegiaoId) return;

    try {
      const months: GrowthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const end = endOfMonth(date);

        const { count } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .eq('regiao_id', selectedRegiaoId)
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
    if (!selectedRegiaoId) return;

    try {
      const { data } = await supabase
        .from('associados')
        .select(`
          id, 
          nome_completo, 
          created_at, 
          status,
          consultor_id
        `)
        .eq('regiao_id', selectedRegiaoId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Buscar nomes dos consultores
      const associadosWithConsultor = await Promise.all(
        (data || []).map(async (associado) => {
          if (associado.consultor_id) {
            const { data: consultorData } = await supabase
              .from('profiles')
              .select('nome_completo')
              .eq('id', associado.consultor_id)
              .single();
            return {
              ...associado,
              consultor_nome: consultorData?.nome_completo || 'N/A',
            };
          }
          return { ...associado, consultor_nome: 'N/A' };
        })
      );

      setRecentAssociados(associadosWithConsultor);
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
        toast.info('Para criar um novo consultor, o usuário deve se cadastrar e você poderá atribuir a permissão.');
      }

      setIsDialogOpen(false);
      fetchConsultores();
    } catch (error: any) {
      console.error('Error saving consultor:', error);
      toast.error(error.message || 'Erro ao salvar consultor');
    }
  };

  const handleSedeChange = (sedeId: string) => {
    setSelectedSedeId(sedeId);
    setSelectedRegiaoId(null);
    setConsultores([]);
    setRecentAssociados([]);
    setGrowthData([]);
    setStats({
      totalConsultores: 0,
      totalAssociados: 0,
      totalVeiculos: 0,
      propostasMes: 0,
      conversaoMes: 0,
    });
  };

  const handleRegiaoChange = (regiaoId: string) => {
    setSelectedRegiaoId(regiaoId);
  };

  const filteredConsultores = consultores.filter(
    (consultor) =>
      consultor.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRegioes = selectedSedeId 
    ? regioes.filter(r => r.sede_id === selectedSedeId)
    : regioes;

  // Loading state
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
                  Painel Regional
                </h1>
                <p className="text-muted-foreground">
                  {isAdminPrincipal 
                    ? 'Visualize dados de qualquer regional' 
                    : `Gerencie sua regional - ${regiao?.nome || ''}`}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="w-fit">
            {isAdminPrincipal ? 'Admin Principal' : 'Admin Regional'}
          </Badge>
        </div>

        {/* Seletor para Admin Principal */}
        {isAdminPrincipal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecione uma Regional</CardTitle>
              <CardDescription>
                Escolha a sede e região para visualizar os dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sede</Label>
                  <Select value={selectedSedeId || ''} onValueChange={handleSedeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Select 
                    value={selectedRegiaoId || ''} 
                    onValueChange={handleRegiaoChange}
                    disabled={!selectedSedeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRegioes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mostrar conteúdo apenas se região selecionada */}
        {selectedRegiaoId ? (
          <>
            {/* Região info */}
            {regiao && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{sede?.nome}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{regiao.nome}</span>
              </div>
            )}

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
                          Gerencie os consultores vinculados à regional
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
                                    <p className="text-xs text-muted-foreground">
                                      Consultor: {associado.consultor_nome}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={associado.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                                    {associado.status}
                                  </Badge>
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(associado.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Consultores */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-primary" />
                          Ranking de Consultores
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
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Selecione uma regional para visualizar os dados</p>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <li>Solicite que o usuário se cadastre no sistema</li>
                  <li>Acesse a página de Usuários (se Admin Principal)</li>
                  <li>Atribua o papel de Consultor ao usuário</li>
                  <li>Defina a regional do consultor</li>
                </ol>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
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
