import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formaPagamentoOptions } from '@/types/financeiro';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
};

interface PagamentoRecord {
  id: string;
  associado_nome: string;
  veiculo_placa: string;
  mes_referencia: string;
  valor_final: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacoes: string | null;
}

export default function Pagamentos() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { isAdminPrincipal, roles } = useAuth();
  
  // Permissões granulares com fallback por role
  const { canAccessPage, canEdit, isLoading: permissionsLoading } = useModuleAccess('financeiro');

  const [pagamentos, setPagamentos] = useState<PagamentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mesFilter, setMesFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [formaFilter, setFormaFilter] = useState<string>('todos');

  const canManage = canEdit || isAdminPrincipal || roles.includes('financeiro');

  const fetchPagamentos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('mensalidades')
        .select(`
          id,
          valor_final,
          mes_referencia,
          data_pagamento,
          forma_pagamento,
          observacoes,
          associados!inner(nome_completo),
          veiculos!inner(placa)
        `)
        .eq('status', 'paga')
        .order('data_pagamento', { ascending: false });

      if (mesFilter) {
        const primeiroDia = `${mesFilter}-01`;
        const ultimoDia = new Date(parseInt(mesFilter.split('-')[0]), parseInt(mesFilter.split('-')[1]), 0).toISOString().split('T')[0];
        query = query.gte('data_pagamento', primeiroDia).lte('data_pagamento', ultimoDia);
      }

      if (formaFilter && formaFilter !== 'todos') {
        query = query.eq('forma_pagamento', formaFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        associado_nome: p.associados?.nome_completo || 'N/A',
        veiculo_placa: p.veiculos?.placa || 'N/A',
        mes_referencia: p.mes_referencia,
        valor_final: p.valor_final,
        data_pagamento: p.data_pagamento,
        forma_pagamento: p.forma_pagamento,
        observacoes: p.observacoes,
      }));

      setPagamentos(formatted);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isChecking && isAllowed) {
      fetchPagamentos();
    }
  }, [isChecking, isAllowed, mesFilter, formaFilter]);

  const filteredPagamentos = pagamentos.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.associado_nome.toLowerCase().includes(term) ||
      p.veiculo_placa.toLowerCase().includes(term)
    );
  });

  const totalRecebido = filteredPagamentos.reduce((acc, p) => acc + Number(p.valor_final), 0);

  const exportToCSV = () => {
    const headers = ['Associado', 'Veículo', 'Referência', 'Valor', 'Data Pagamento', 'Forma'];
    const rows = filteredPagamentos.map(p => [
      p.associado_nome,
      p.veiculo_placa,
      format(new Date(p.mes_referencia), 'MMM/yyyy', { locale: ptBR }),
      p.valor_final.toFixed(2).replace('.', ','),
      formatDate(p.data_pagamento),
      formaPagamentoOptions.find(f => f.value === p.forma_pagamento)?.label || p.forma_pagamento,
    ]);

    const csvContent = '\ufeff' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos_${mesFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado com sucesso!');
  };

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-green-500" />
                Pagamentos Recebidos
              </h1>
              <p className="text-muted-foreground">
                Histórico de pagamentos confirmados
              </p>
            </div>
          </div>

          {canManage && (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>

        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRecebido)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quantidade de Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPagamentos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(filteredPagamentos.length > 0 ? totalRecebido / filteredPagamentos.length : 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Associado ou placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mês de Pagamento</Label>
                <Input
                  type="month"
                  value={mesFilter}
                  onChange={(e) => setMesFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={formaFilter} onValueChange={setFormaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {formaPagamentoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={fetchPagamentos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associado</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Forma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.associado_nome}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{p.veiculo_placa}</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(p.mes_referencia), 'MMM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(p.valor_final)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {formatDate(p.data_pagamento)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formaPagamentoOptions.find(f => f.value === p.forma_pagamento)?.label || p.forma_pagamento}
                          </Badge>
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