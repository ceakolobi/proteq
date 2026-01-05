import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  Download, 
  ArrowLeft,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface ReportData {
  mes: string;
  recebido: number;
  pendente: number;
  atrasado: number;
  total: number;
}

export default function RelatoriosFinanceiros() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { isAdminPrincipal, roles } = useAuth();
  
  // Permissões granulares com fallback por role
  const { canAccessPage, isLoading: permissionsLoading } = useModuleAccess('financeiro');
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [filters, setFilters] = useState({
    dataInicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tipoRelatorio: 'mensal',
  });

  const canExport = isAdminPrincipal || roles.includes('financeiro');

  useEffect(() => {
    if (!isChecking && isAllowed) {
      fetchReportData();
    }
  }, [isChecking, isAllowed]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensalidades')
        .select('mes_referencia, status, valor_final')
        .gte('mes_referencia', filters.dataInicio)
        .lte('mes_referencia', filters.dataFim);

      if (error) throw error;

      // Agrupar por mês
      const agrupado: Record<string, ReportData> = {};
      
      (data || []).forEach((m: any) => {
        const mesKey = m.mes_referencia.slice(0, 7);
        
        if (!agrupado[mesKey]) {
          agrupado[mesKey] = {
            mes: format(new Date(m.mes_referencia), 'MMM/yy', { locale: ptBR }),
            recebido: 0,
            pendente: 0,
            atrasado: 0,
            total: 0,
          };
        }

        const valor = Number(m.valor_final);
        agrupado[mesKey].total += valor;

        if (m.status === 'paga') {
          agrupado[mesKey].recebido += valor;
        } else if (m.status === 'atrasada') {
          agrupado[mesKey].atrasado += valor;
        } else if (m.status === 'pendente') {
          agrupado[mesKey].pendente += valor;
        }
      });

      setReportData(Object.values(agrupado).sort((a, b) => a.mes.localeCompare(b.mes)));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Mês', 'Recebido', 'Pendente', 'Atrasado', 'Total'];
    const rows = reportData.map(r => [
      r.mes,
      r.recebido.toFixed(2),
      r.pendente.toFixed(2),
      r.atrasado.toFixed(2),
      r.total.toFixed(2),
    ]);

    const csvContent = [
      '\uFEFF' + headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  // Totais
  const totais = reportData.reduce(
    (acc, r) => ({
      recebido: acc.recebido + r.recebido,
      pendente: acc.pendente + r.pendente,
      atrasado: acc.atrasado + r.atrasado,
      total: acc.total + r.total,
    }),
    { recebido: 0, pendente: 0, atrasado: 0, total: 0 }
  );

  if (isChecking) {
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Relatórios Financeiros
              </h1>
              <p className="text-muted-foreground">
                Análise de pagamentos e exportações
              </p>
            </div>
          </div>

          {canExport && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Período do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={filters.tipoRelatorio} 
                  onValueChange={(value) => setFilters({ ...filters, tipoRelatorio: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchReportData} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totais.recebido)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totais.pendente)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Atrasado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totais.atrasado)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totais.total)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução por Período</CardTitle>
            <CardDescription>
              Comparativo de recebimentos, pendências e atrasos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {reportData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendente" name="Pendente" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atrasado" name="Atrasado" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {loading ? 'Carregando...' : 'Nenhum dado encontrado para o período'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
