import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toLocalYMD } from '@/lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
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
import { Input } from '@/components/ui/input';
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
  Eye,
  DollarSign,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Associado, Sede } from '@/types/database';
import { associateStatusLabels } from '@/types/database';
import { format, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConsultorStats {
  totalAssociados: number;
  associadosAtivos: number;
  totalVeiculos: number;
  propostasMes: number;
  leadsAbertos: number;
}

interface ComissaoConsultor {
  id: string;
  associado_id: string;
  mensalidade_base: number;
  percentual_consultor: number;
  valor_consultor: number;
  status: string;
  mes_referencia: string;
  pago_em: string | null;
  associado_nome?: string;
}

interface HistoricoMesConsultor {
  mes: string;
  previsto: number;
  confirmado: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsultorDashboard() {
  const { user, profile, hasRole, isAdminPrincipal } = useAuth();
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('all_roles');

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

  // Comissões
  const [comissoes, setComissoes] = useState<ComissaoConsultor[]>([]);
  const [historicoComissoes, setHistoricoComissoes] = useState<HistoricoMesConsultor[]>([]);
  const [mesReferencia, setMesReferencia] = useState(() => format(new Date(), 'yyyy-MM'));
  const [percentualConfigurado, setPercentualConfigurado] = useState<number | null>(null);
  const [comissoesStats, setComissoesStats] = useState({ previsto: 0, confirmado: 0 });
  const [isLoadingComissoes, setIsLoadingComissoes] = useState(false);

  const isConsultor = hasRole('consultor_vendas') || isAdminPrincipal;

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchComissoes();
    }
  }, [mesReferencia, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPercentualConfigurado();
      fetchHistoricoComissoes();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      if (profile?.sede_id) {
        const { data: sedeData } = await supabase
          .from('sedes')
          .select('*')
          .eq('id', profile.sede_id)
          .maybeSingle();
        if (sedeData) setSede({ ...sedeData, tipo: sedeData.tipo as 'matriz' | 'regional' });
      }

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

      const ativos = typedAssociados.filter(a => a.status === 'ativo').length;

      let veiculosCount = 0;
      if (typedAssociados.length > 0) {
        const { count } = await supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true })
          .in('associado_id', typedAssociados.map(a => a.id));
        veiculosCount = count || 0;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: propostasCount } = await supabase
        .from('propostas')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', user!.id)
        .gte('created_at', startOfMonth.toISOString());

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

  const fetchPercentualConfigurado = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('configuracao_comissoes' as any)
        .select('percentual_consultor')
        .eq('consultor_id', user.id)
        .maybeSingle();
      if (data) setPercentualConfigurado((data as any).percentual_consultor ?? null);
    } catch (e) {
      console.error('Error fetching percentual:', e);
    }
  };

  const fetchComissoes = async () => {
    if (!user?.id) return;
    setIsLoadingComissoes(true);
    try {
      const mesStart = `${mesReferencia}-01`;
      const [ano, mes] = mesReferencia.split('-').map(Number);
      const mesEnd = toLocalYMD(new Date(ano, mes, 0));

      const { data, error } = await supabase
        .from('comissoes' as any)
        .select('*')
        .eq('consultor_id', user.id)
        .gte('mes_referencia', mesStart)
        .lte('mes_referencia', mesEnd)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched: ComissaoConsultor[] = await Promise.all(
        ((data as unknown as ComissaoConsultor[]) || []).map(async (c) => {
          const { data: assoc } = await supabase
            .from('associados').select('nome_completo').eq('id', c.associado_id).single();
          return { ...c, associado_nome: assoc?.nome_completo || 'N/A' };
        })
      );

      setComissoes(enriched);
      const previsto = enriched.reduce((s, c) => s + (c.valor_consultor || 0), 0);
      const confirmado = enriched.filter(c => c.status === 'confirmada').reduce((s, c) => s + (c.valor_consultor || 0), 0);
      setComissoesStats({ previsto, confirmado });
    } catch (e: any) {
      toast.error('Erro ao buscar comissões');
    } finally {
      setIsLoadingComissoes(false);
    }
  };

  const fetchHistoricoComissoes = async () => {
    if (!user?.id) return;
    try {
      const months: HistoricoMesConsultor[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const mesStart = format(date, 'yyyy-MM-01');
        const mesEnd = format(endOfMonth(date), 'yyyy-MM-dd');

        const { data } = await supabase
          .from('comissoes' as any)
          .select('status, valor_consultor')
          .eq('consultor_id', user.id)
          .gte('mes_referencia', mesStart)
          .lte('mes_referencia', mesEnd);

        const rows = (data as any[]) || [];
        months.push({
          mes: format(date, 'MMM/yy', { locale: ptBR }),
          previsto: rows.reduce((s: number, c: any) => s + (c.valor_consultor || 0), 0),
          confirmado: rows.filter((c: any) => c.status === 'confirmada').reduce((s: number, c: any) => s + (c.valor_consultor || 0), 0),
        });
      }
      setHistoricoComissoes(months);
    } catch (e) {
      console.error('Error fetching historico comissoes:', e);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'inadimplente': return 'destructive';
      case 'suspenso': return 'secondary';
      case 'cancelado': return 'outline';
      default: return 'secondary';
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }
  if (!isAllowed) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do Consultor</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.nome_completo?.split(' ')[0]}!</p>
            {sede && (
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Regional: {sede.nome}</span>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Meus Associados</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAssociados}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.associadosAtivos} ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Veículos</CardTitle>
              <Car className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalVeiculos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Propostas (Mês)</CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.propostasMes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads Abertos</CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.leadsAbertos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Conversão</CardTitle>
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
          {[
            { label: 'Novo Associado', desc: 'Cadastrar cliente', icon: <UserPlus className="h-6 w-6 text-primary" />, bg: 'bg-primary/10', path: '/associados/novo' },
            { label: 'Nova Cotação', desc: 'Simular proteção', icon: <FileText className="h-6 w-6 text-green-600" />, bg: 'bg-green-500/10', path: '/cotacao' },
            { label: 'Meus Leads', desc: `${stats.leadsAbertos} abertos`, icon: <Users className="h-6 w-6 text-yellow-600" />, bg: 'bg-yellow-500/10', path: '/leads' },
            { label: 'Ver Base', desc: `${stats.totalAssociados} associados`, icon: <Eye className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-500/10', path: '/associados' },
          ].map(item => (
            <Card key={item.label} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(item.path)}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-3 ${item.bg} rounded-lg`}>{item.icon}</div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Associados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Associados Recentes</CardTitle>
                <CardDescription>Últimos associados cadastrados</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/associados')}>Ver todos</Button>
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
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : associados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhum associado cadastrado</p>
                          <Button variant="outline" size="sm" onClick={() => navigate('/associados/novo')}>
                            Cadastrar primeiro associado
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : associados.slice(0, 5).map(associado => (
                    <TableRow key={associado.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(associado.nome_completo ?? '').trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
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
                          <p className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" />{associado.email}</p>
                          <p className="text-sm flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{associado.telefone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(associado.status)}>
                          {associateStatusLabels[associado.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(associado.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Comissões ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              Minhas Comissões
            </h2>
            <Input
              type="month"
              value={mesReferencia}
              onChange={e => setMesReferencia(e.target.value)}
              className="w-40"
            />
          </div>

          {/* Cards comissões */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Previsto (mês)</CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{fmtBRL(comissoesStats.previsto)}</div>
                <p className="text-xs text-muted-foreground mt-1">Aguardando confirmação</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Confirmado (mês)</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{fmtBRL(comissoesStats.confirmado)}</div>
                <p className="text-xs text-muted-foreground mt-1">Já recebido</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Associados no mês</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comissoes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Com comissão gerada</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Meu %</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {percentualConfigurado !== null ? `${percentualConfigurado}%` : '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Configurado pelo regional</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de comissões */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento do Mês</CardTitle>
              <CardDescription>Comissões por associado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Associado</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="text-right">Meu %</TableHead>
                      <TableHead className="text-right">Meu valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingComissoes ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : comissoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma comissão registrada para este mês
                        </TableCell>
                      </TableRow>
                    ) : comissoes.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.associado_nome}</TableCell>
                        <TableCell className="text-right">{fmtBRL(c.mensalidade_base)}</TableCell>
                        <TableCell className="text-right">{c.percentual_consultor}%</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{fmtBRL(c.valor_consultor)}</TableCell>
                        <TableCell>
                          <Badge className={c.status === 'confirmada'
                            ? 'bg-green-100 text-green-800 border-green-300 border'
                            : 'bg-amber-100 text-amber-800 border-amber-300 border'}>
                            {c.status === 'confirmada' ? 'Confirmada' : 'Prevista'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.pago_em ? format(new Date(c.pago_em), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Histórico por mês */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico (6 meses)</CardTitle>
              <CardDescription>Previsto vs confirmado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {historicoComissoes.map(m => (
                  <div key={m.mes} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-16">{m.mes}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: m.previsto > 0 ? `${Math.min((m.confirmado / m.previsto) * 100, 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[140px]">
                      <span className="text-xs text-green-600 font-medium">{fmtBRL(m.confirmado)}</span>
                      <span className="text-xs text-muted-foreground"> / {fmtBRL(m.previsto)}</span>
                    </div>
                  </div>
                ))}
                {historicoComissoes.every(m => m.previsto === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem histórico de comissões ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
