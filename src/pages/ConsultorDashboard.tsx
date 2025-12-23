import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Car, 
  FileText, 
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Eye
} from 'lucide-react';
import type { Associado, Sede } from '@/types/database';
import { associateStatusLabels } from '@/types/database';

interface ConsultorStats {
  totalAssociados: number;
  associadosAtivos: number;
  totalVeiculos: number;
  propostasMes: number;
  leadsAbertos: number;
}

export default function ConsultorDashboard() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ConsultorStats>({
    totalAssociados: 0,
    associadosAtivos: 0,
    totalVeiculos: 0,
    propostasMes: 0,
    leadsAbertos: 0,
  });
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [sede, setSede] = useState<Sede | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isConsultor = hasRole('consultor_vendas');

  useEffect(() => {
    if (!isConsultor) {
      navigate('/dashboard');
      toast.error('Acesso restrito a Consultores');
    }
  }, [isConsultor, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch sede info
      if (profile?.sede_id) {
        const { data: sedeData } = await supabase
          .from('sedes')
          .select('*')
          .eq('id', profile.sede_id)
          .maybeSingle();
        
        if (sedeData) {
          setSede({
            ...sedeData,
            tipo: sedeData.tipo as 'matriz' | 'regional',
          });
        }
      }

      // Fetch associados do consultor
      const { data: associadosData, error: associadosError } = await supabase
        .from('associados')
        .select('*')
        .eq('consultor_id', user!.id)
        .order('created_at', { ascending: false });

      if (associadosError) throw associadosError;
      
      const typedAssociados = (associadosData || []).map(a => ({
        ...a,
        status: a.status as Associado['status'],
      }));
      
      setAssociados(typedAssociados);

      // Calculate stats
      const ativos = typedAssociados.filter(a => a.status === 'ativo').length;

      // Get veiculos count
      let veiculosCount = 0;
      if (typedAssociados.length > 0) {
        const { count } = await supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true })
          .in('associado_id', typedAssociados.map(a => a.id));
        veiculosCount = count || 0;
      }

      // Get propostas do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: propostasCount } = await supabase
        .from('propostas')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', user!.id)
        .gte('created_at', startOfMonth.toISOString());

      // Get leads abertos
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', user!.id)
        .eq('convertido', false);

      setStats({
        totalAssociados: typedAssociados.length,
        associadosAtivos: ativos,
        totalVeiculos: veiculosCount,
        propostasMes: propostasCount || 0,
        leadsAbertos: leadsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
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

  if (!isConsultor) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do Consultor</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {profile?.nome_completo?.split(' ')[0]}!
            </p>
            {sede && (
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Regional: {sede.nome}
                </span>
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/associados/novo')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Associado
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meus Associados
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAssociados}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.associadosAtivos} ativos
              </p>
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
              <div className="text-3xl font-bold">{stats.totalVeiculos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Propostas (Mês)
              </CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.propostasMes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads Abertos
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.leadsAbertos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa Conversão
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.totalAssociados > 0 && stats.leadsAbertos > 0
                  ? `${Math.round((stats.totalAssociados / (stats.totalAssociados + stats.leadsAbertos)) * 100)}%`
                  : '--'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/associados/novo')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Novo Associado</p>
                <p className="text-sm text-muted-foreground">Cadastrar cliente</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/cotacao')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Nova Cotação</p>
                <p className="text-sm text-muted-foreground">Simular proteção</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/leads')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">Meus Leads</p>
                <p className="text-sm text-muted-foreground">{stats.leadsAbertos} abertos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/associados')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Ver Base</p>
                <p className="text-sm text-muted-foreground">{stats.totalAssociados} associados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Associados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Associados Recentes</CardTitle>
                <CardDescription>
                  Últimos associados cadastrados
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/associados')}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : associados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Nenhum associado cadastrado
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/associados/novo')}
                          >
                            Cadastrar primeiro associado
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    associados.slice(0, 5).map((associado) => (
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
                          <Badge variant={getStatusVariant(associado.status)}>
                            {associateStatusLabels[associado.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(associado.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
