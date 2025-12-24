import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { roleLabels } from '@/types/database';

interface DashboardStats {
  totalAssociados: number;
  associadosAtivos: number;
  totalVeiculos: number;
  propostasHoje: number;
  inadimplentes: number;
  vistoriasPendentes: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, roles, isAdminPrincipal, user } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalAssociados: 0,
    associadosAtivos: 0,
    totalVeiculos: 0,
    propostasHoje: 0,
    inadimplentes: 0,
    vistoriasPendentes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAllowed || isChecking) return;

    const fetchStats = async () => {
      try {
        // Fetch associados count - RLS will filter based on user role
        const { count: totalAssociados } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true });

        const { count: associadosAtivos } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo');

        const { count: inadimplentes } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'inadimplente');

        // Fetch veiculos count - RLS will filter based on user role
        const { count: totalVeiculos } = await supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true });

        // Fetch propostas hoje - only if user can see proposals
        const today = new Date().toISOString().split('T')[0];
        const { count: propostasHoje } = await supabase
          .from('propostas')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today);

        // Fetch vistorias pendentes
        const { count: vistoriasPendentes } = await supabase
          .from('vistorias')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendente');

        setStats({
          totalAssociados: totalAssociados || 0,
          associadosAtivos: associadosAtivos || 0,
          totalVeiculos: totalVeiculos || 0,
          propostasHoje: propostasHoje || 0,
          inadimplentes: inadimplentes || 0,
          vistoriasPendentes: vistoriasPendentes || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isAllowed, isChecking]);

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

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    trend,
    variant = 'default'
  }: { 
    title: string; 
    value: number; 
    icon: React.ElementType;
    description?: string;
    trend?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  }) => {
    const variants = {
      default: 'text-primary',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      danger: 'text-destructive',
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={`h-5 w-5 ${variants[variant]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{isLoading ? '-' : value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo, {profile?.nome_completo?.split(' ')[0] || 'Usuário'}!
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {isAdminPrincipal && (
              <Badge variant="default" className="bg-primary">
                {roleLabels.admin_principal}
              </Badge>
            )}
            {roles.map((role) => (
              <Badge key={role} variant="secondary">
                {roleLabels[role]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Associados"
            value={stats.totalAssociados}
            icon={Users}
            description={`${stats.associadosAtivos} ativos`}
          />
          <StatCard
            title="Veículos Protegidos"
            value={stats.totalVeiculos}
            icon={Car}
            variant="success"
          />
          <StatCard
            title="Propostas Hoje"
            value={stats.propostasHoje}
            icon={FileText}
          />
          <StatCard
            title="Vistorias Pendentes"
            value={stats.vistoriasPendentes}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Associados Ativos
              </CardTitle>
              <CardDescription>Em dia com a associação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {isLoading ? '-' : stats.associadosAtivos}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Inadimplentes
              </CardTitle>
              <CardDescription>Necessitam atenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive">
                {isLoading ? '-' : stats.inadimplentes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Taxa de Conversão
              </CardTitle>
              <CardDescription>Propostas aceitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                --
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/cotacao')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/cotacao');
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Nova Cotação</p>
                    <p className="text-sm text-muted-foreground">Simular proteção</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/leads')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/leads');
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Novo Lead</p>
                    <p className="text-sm text-muted-foreground">Cadastrar contato</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/veiculos')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/veiculos');
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Veículos</p>
                    <p className="text-sm text-muted-foreground">Gerenciar frota</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/vistorias')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/vistorias');
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Vistorias</p>
                    <p className="text-sm text-muted-foreground">Pendentes: {stats.vistoriasPendentes}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
