import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Users, 
  RefreshCw, 
  ArrowLeft,
  AlertTriangle,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import type { InadimplenteInfo } from '@/types/financeiro';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getStatusBadge = (status: InadimplenteInfo['status_financeiro']) => {
  switch (status) {
    case 'critico':
      return <Badge className="bg-red-500 text-white">Crítico</Badge>;
    case 'atencao':
      return <Badge className="bg-orange-500 text-white">Atenção</Badge>;
    default:
      return <Badge className="bg-yellow-500 text-yellow-950">Regular</Badge>;
  }
};

export default function Inadimplencia() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('financeiro_only');
  const { inadimplentes, fetchInadimplentes } = useFinanceiro();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isChecking && isAllowed) {
      setLoading(true);
      fetchInadimplentes().finally(() => setLoading(false));
    }
  }, [isChecking, isAllowed, fetchInadimplentes]);

  // Estatísticas
  const totalDevido = inadimplentes.reduce((acc, i) => acc + i.total_devido, 0);
  const criticos = inadimplentes.filter(i => i.status_financeiro === 'critico').length;
  const atencao = inadimplentes.filter(i => i.status_financeiro === 'atencao').length;

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
                <AlertTriangle className="h-6 w-6 text-red-500" />
                Controle de Inadimplência
              </h1>
              <p className="text-muted-foreground">
                Associados com pagamentos em atraso
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => {
              setLoading(true);
              fetchInadimplentes().finally(() => setLoading(false));
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Inadimplentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inadimplentes.length}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Situação Crítica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticos}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{atencao}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total em Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalDevido)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Inadimplentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Inadimplentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associado</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead className="text-center">Mensalidades Atrasadas</TableHead>
                    <TableHead className="text-center">Maior Atraso</TableHead>
                    <TableHead className="text-right">Total Devido</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inadimplentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="h-8 w-8 text-green-500" />
                          <span>Nenhum associado inadimplente!</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inadimplentes.map((i) => (
                      <TableRow key={i.associado_id}>
                        <TableCell className="font-medium">
                          {i.associado_nome}
                        </TableCell>
                        <TableCell>
                          {i.regiao_nome || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {i.mensalidades_atrasadas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${i.dias_maior_atraso > 60 ? 'text-red-600' : i.dias_maior_atraso > 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                            {i.dias_maior_atraso} dias
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(i.total_devido)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(i.status_financeiro)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/associados?id=${i.associado_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/financeiro/mensalidades?associado=${i.associado_id}`)}
                            >
                              Ver Mensalidades
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white">Crítico</Badge>
                <span className="text-muted-foreground">+60 dias ou 3+ mensalidades</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500 text-white">Atenção</Badge>
                <span className="text-muted-foreground">+30 dias ou 2 mensalidades</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-yellow-950">Regular</Badge>
                <span className="text-muted-foreground">Atraso recente</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
