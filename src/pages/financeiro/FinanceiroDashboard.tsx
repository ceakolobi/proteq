import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Calendar,
  CreditCard,
  FileText,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Settings,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6b7280', '#f97316'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Financeiro() {
  const navigate = useNavigate();
  const { isAllowed, isChecking, userSedeId, userRegiaoId } = useAccessControl('admin_or_basico');
  const { user, roles, isAdminPrincipal } = useAuth();
  const { 
    stats, 
    loading, 
    fetchStats, 
    gerarMensalidadesMes, 
    atualizarAtrasadas 
  } = useFinanceiro();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const canManage = isAdminPrincipal || roles.includes('financeiro');

  useEffect(() => {
    if (!isChecking && !isAllowed) {
      toast.error('Acesso restrito ao módulo financeiro');
      navigate('/dashboard');
    }
  }, [isChecking, isAllowed, navigate]);

  const handleGerarMensalidades = async () => {
    setIsGenerating(true);
    const mesAtual = new Date().toISOString().slice(0, 7) + '-01';
    const result = await gerarMensalidadesMes(mesAtual);
    
    if (result.success) {
      toast.success(`${result.count} mensalidades geradas com sucesso!`);
      fetchStats();
    } else {
      toast.error('Erro ao gerar mensalidades');
    }
    setIsGenerating(false);
  };

  const handleAtualizarAtrasadas = async () => {
    setIsUpdating(true);
    const result = await atualizarAtrasadas();
    
    if (result.success) {
      toast.success(`${result.count} mensalidades atualizadas para atrasadas`);
      fetchStats();
    } else {
      toast.error('Erro ao atualizar status');
    }
    setIsUpdating(false);
  };

  // Dados para gráfico de pizza
  const pieData = stats ? [
    { name: 'Pagas', value: stats.mensalidadesPagas, color: '#22c55e' },
    { name: 'Pendentes', value: stats.mensalidadesPendentes, color: '#eab308' },
    { name: 'Atrasadas', value: stats.mensalidadesAtrasadas, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  // Dados para gráfico de barras (últimos 6 meses - simulado)
  const barData = [
    { mes: 'Jul', recebido: 45000, pendente: 5000 },
    { mes: 'Ago', recebido: 48000, pendente: 4500 },
    { mes: 'Set', recebido: 52000, pendente: 6000 },
    { mes: 'Out', recebido: 50000, pendente: 5500 },
    { mes: 'Nov', recebido: 55000, pendente: 4000 },
    { mes: 'Dez', recebido: stats?.totalRecebido || 0, pendente: stats?.totalAReceber || 0 },
  ];

  if (isChecking || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-7 w-7 text-primary" />
              Módulo Financeiro
            </h1>
            <p className="text-muted-foreground">
              Gestão de mensalidades, pagamentos e inadimplência
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleAtualizarAtrasadas}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Atrasadas
                </Button>
                <Button 
                  onClick={handleGerarMensalidades}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Gerar Mensalidades
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recebido no Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalRecebido || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.mensalidadesPagas || 0} mensalidades pagas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Vencer
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats?.totalAVencer || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.mensalidadesAVencer || 0} mensalidades a vencer
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inadimplência
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats?.totalInadimplencia || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.mensalidadesAtrasadas || 0} mensalidades atrasadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Associados Inadimplentes
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.associadosInadimplentes || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                com pagamentos em atraso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navegação rápida */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/financeiro/mensalidades')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Mensalidades</h3>
                <p className="text-sm text-muted-foreground">Gerir cobranças mensais</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/financeiro/pagamentos')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-green-500/10">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Pagamentos</h3>
                <p className="text-sm text-muted-foreground">Registrar recebimentos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/financeiro/inadimplencia')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-red-500/10">
                <Users className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Inadimplência</h3>
                <p className="text-sm text-muted-foreground">Controle de devedores</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/financeiro/relatorios')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-500/10">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Relatórios</h3>
                <p className="text-sm text-muted-foreground">Análises e exportações</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Barras - Evolução Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução Mensal
              </CardTitle>
              <CardDescription>
                Comparativo de recebimentos nos últimos meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: 'var(--foreground)' }}
                      contentStyle={{ 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendente" name="Pendente" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Status das Mensalidades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status das Mensalidades
              </CardTitle>
              <CardDescription>
                Distribuição por status no mês atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => value}
                        contentStyle={{ 
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma mensalidade no período
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas para admin */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ações Administrativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate('/financeiro/configuracoes')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações Financeiras
                </Button>
                <Button variant="outline" onClick={() => navigate('/financeiro/relatorios')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Relatório Mensal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
