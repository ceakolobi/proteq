import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Users, 
  UserCheck,
  TrendingUp,
  Calendar,
  MapPin
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminStats {
  totalRegioes: number;
  totalConsultores: number;
  totalAssociados: number;
}

interface GrowthData {
  month: string;
  associados: number;
}

interface RecentItem {
  id: string;
  nome: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('admin_principal_only');
  
  const [stats, setStats] = useState<AdminStats>({
    totalRegioes: 0,
    totalConsultores: 0,
    totalAssociados: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [recentRegioes, setRecentRegioes] = useState<RecentItem[]>([]);
  const [recentConsultores, setRecentConsultores] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAllowed || isChecking) return;

    const fetchData = async () => {
      try {
        // Fetch total regiões
        const { count: totalRegioes } = await supabase
          .from('regioes')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true);

        // Fetch total consultores (users with consultor_vendas role)
        const { data: consultoresData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'consultor_vendas');

        const totalConsultores = consultoresData?.length || 0;

        // Fetch total associados
        const { count: totalAssociados } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalRegioes: totalRegioes || 0,
          totalConsultores,
          totalAssociados: totalAssociados || 0,
        });

        // Fetch growth data (last 6 months)
        const months: GrowthData[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const start = startOfMonth(date);
          const end = endOfMonth(date);

          const { count } = await supabase
            .from('associados')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', end.toISOString());

          months.push({
            month: format(date, 'MMM', { locale: ptBR }),
            associados: count || 0,
          });
        }
        setGrowthData(months);

        // Fetch recent regiões
        const { data: regioes } = await supabase
          .from('regioes')
          .select('id, nome, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentRegioes(regioes || []);

        // Fetch recent consultores
        const { data: consultorRoles } = await supabase
          .from('user_roles')
          .select('user_id, created_at')
          .eq('role', 'consultor_vendas')
          .order('created_at', { ascending: false })
          .limit(5);

        if (consultorRoles && consultorRoles.length > 0) {
          const userIds = consultorRoles.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome_completo, created_at')
            .in('id', userIds);

          setRecentConsultores(
            profiles?.map(p => ({
              id: p.id,
              nome: p.nome_completo,
              created_at: p.created_at,
            })) || []
          );
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAllowed, isChecking]);

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

  const chartConfig = {
    associados: {
      label: "Associados",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema - Olá, {profile?.nome_completo?.split(' ')[0] || 'Administrador'}!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Regionais
              </CardTitle>
              <Building2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {isLoading ? '-' : stats.totalRegioes}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Regiões ativas no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consultores Ativos
              </CardTitle>
              <UserCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {isLoading ? '-' : stats.totalConsultores}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Consultores cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Associados
              </CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {isLoading ? '-' : stats.totalAssociados}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Associados no sistema
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Crescimento de Associados
            </CardTitle>
            <CardDescription>
              Evolução nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando dados...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAssociados" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#colorAssociados)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Items Lists */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Últimas Regionais
              </CardTitle>
              <CardDescription>
                Regiões cadastradas recentemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentRegioes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma região cadastrada</p>
              ) : (
                <div className="space-y-3">
                  {recentRegioes.map((regiao) => (
                    <div
                      key={regiao.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{regiao.nome}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(regiao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Consultants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Últimos Consultores
              </CardTitle>
              <CardDescription>
                Consultores cadastrados recentemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentConsultores.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum consultor cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {recentConsultores.map((consultor) => (
                    <div
                      key={consultor.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-md">
                          <UserCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium">{consultor.nome}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(consultor.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
