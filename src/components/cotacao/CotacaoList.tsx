import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Eye, 
  MessageCircle,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
} from 'lucide-react';
import type { Cotacao, CotacaoStatus } from '@/types/cotacao';
import { cotacaoStatusLabels, cotacaoStatusColors, tipoBemLabels } from '@/types/cotacao';

interface CotacaoListProps {
  cotacoes: (Cotacao & { lead_nome?: string; regiao_nome?: string })[];
  isLoading: boolean;
  onNewCotacao: () => void;
  onViewCotacao: (cotacao: Cotacao) => void;
  onAddContato: (cotacao: Cotacao) => void;
}

export default function CotacaoList({ 
  cotacoes, 
  isLoading, 
  onNewCotacao, 
  onViewCotacao,
  onAddContato 
}: CotacaoListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CotacaoStatus | 'all'>('all');

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredCotacoes = cotacoes.filter((cotacao) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      cotacao.marca.toLowerCase().includes(searchLower) ||
      cotacao.modelo.toLowerCase().includes(searchLower) ||
      cotacao.lead_nome?.toLowerCase().includes(searchLower) ||
      cotacao.placa?.toLowerCase().includes(searchLower);

    const matchesStatus = filterStatus === 'all' || cotacao.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cotacoes.length,
    novos: cotacoes.filter(c => c.status === 'novo').length,
    emContato: cotacoes.filter(c => c.status === 'em_contato' || c.status === 'interessado' || c.status === 'aguardando_retorno').length,
    aprovados: cotacoes.filter(c => c.status === 'aprovado').length,
    perdidos: cotacoes.filter(c => c.status === 'perdido').length,
  };

  const getStatusIcon = (status: CotacaoStatus) => {
    switch (status) {
      case 'novo': return <Clock className="w-4 h-4" />;
      case 'em_contato': return <Phone className="w-4 h-4" />;
      case 'interessado': return <MessageCircle className="w-4 h-4" />;
      case 'aguardando_retorno': return <Calendar className="w-4 h-4" />;
      case 'aprovado': return <CheckCircle className="w-4 h-4" />;
      case 'perdido': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novos
            </CardTitle>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.novos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Negociação
            </CardTitle>
            <MessageCircle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.emContato}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprovados
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.aprovados}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 
                ? `${Math.round((stats.aprovados / stats.total) * 100)}% conversão`
                : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Minhas Cotações</CardTitle>
              <CardDescription>
                Gerencie suas cotações e acompanhe o funil de vendas
              </CardDescription>
            </div>
            <Button onClick={onNewCotacao}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Cotação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo, placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as CotacaoStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(cotacaoStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCotacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'Nenhuma cotação encontrada'
                            : 'Nenhuma cotação cadastrada'}
                        </p>
                        {!searchTerm && filterStatus === 'all' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={onNewCotacao}
                          >
                            Criar primeira cotação
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCotacoes.map((cotacao) => (
                    <TableRow key={cotacao.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {cotacao.marca} {cotacao.modelo}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tipoBemLabels[cotacao.tipo_bem]} • {cotacao.ano_fabricacao}
                          </p>
                          {cotacao.placa && (
                            <p className="text-xs text-muted-foreground">{cotacao.placa}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cotacao.lead_nome || '-'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(cotacao.valor_bem)}
                      </TableCell>
                      <TableCell>
                        <span className={!cotacao.mensalidade || cotacao.mensalidade <= 0 ? 'text-destructive' : 'font-medium text-primary'}>
                          {cotacao.mensalidade && cotacao.mensalidade > 0 
                            ? formatCurrency(cotacao.mensalidade)
                            : 'Não calculada'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${cotacaoStatusColors[cotacao.status]} gap-1`}>
                          {getStatusIcon(cotacao.status)}
                          {cotacaoStatusLabels[cotacao.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(cotacao.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onAddContato(cotacao)}
                            title="Registrar contato"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewCotacao(cotacao)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
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
    </div>
  );
}
