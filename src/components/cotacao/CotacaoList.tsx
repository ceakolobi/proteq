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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  MoreVertical,
  Archive,
  Lock,
  AlertTriangle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type { Cotacao, CotacaoStatus } from '@/types/cotacao';
import { cotacaoStatusLabels, cotacaoStatusColors, tipoBemLabels } from '@/types/cotacao';
import { useAuth } from '@/contexts/AuthContext';
import { useCotacoes } from '@/hooks/useCotacoes';
import { toast } from 'sonner';

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
  const { isAdminPrincipal, hasRole } = useAuth();
  const { updateCotacao, refetch } = useCotacoes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CotacaoStatus | 'all'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'arquivar' | 'bloquear' | 'quarentena' | 'excluir' | 'restaurar' | null;
    cotacao: Cotacao | null;
  }>({ open: false, action: null, cotacao: null });

  // Check if user is admin
  const isAdmin = isAdminPrincipal || hasRole('admin_nivel_basico');

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

  // Filter out archived/blocked/quarantine for non-admins unless specifically filtered
  const visibleCotacoes = cotacoes.filter((cotacao) => {
    // Admins see all
    if (isAdmin) return true;
    // Non-admins don't see archived, blocked or quarantine
    return !['arquivado', 'bloqueado', 'quarentena'].includes(cotacao.status);
  });

  const filteredCotacoes = visibleCotacoes.filter((cotacao) => {
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
    total: visibleCotacoes.length,
    novos: visibleCotacoes.filter(c => c.status === 'novo').length,
    emContato: visibleCotacoes.filter(c => c.status === 'em_contato' || c.status === 'interessado' || c.status === 'aguardando_retorno').length,
    aprovados: visibleCotacoes.filter(c => c.status === 'aprovado').length,
    perdidos: visibleCotacoes.filter(c => c.status === 'perdido').length,
  };

  const getStatusIcon = (status: CotacaoStatus) => {
    switch (status) {
      case 'novo': return <Clock className="w-4 h-4" />;
      case 'em_contato': return <Phone className="w-4 h-4" />;
      case 'interessado': return <MessageCircle className="w-4 h-4" />;
      case 'aguardando_retorno': return <Calendar className="w-4 h-4" />;
      case 'aprovado': return <CheckCircle className="w-4 h-4" />;
      case 'perdido': return <XCircle className="w-4 h-4" />;
      case 'arquivado': return <Archive className="w-4 h-4" />;
      case 'bloqueado': return <Lock className="w-4 h-4" />;
      case 'quarentena': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleAdminAction = async () => {
    if (!confirmDialog.cotacao || !confirmDialog.action) return;

    const statusMap: Record<string, CotacaoStatus> = {
      arquivar: 'arquivado',
      bloquear: 'bloqueado',
      quarentena: 'quarentena',
      excluir: 'arquivado', // Soft delete = archive
      restaurar: 'novo',
    };

    const newStatus = statusMap[confirmDialog.action];
    const success = await updateCotacao(confirmDialog.cotacao.id, { status: newStatus });
    
    if (success) {
      const messages: Record<string, string> = {
        arquivar: 'Cotação arquivada com sucesso',
        bloquear: 'Cotação bloqueada com sucesso',
        quarentena: 'Cotação movida para quarentena',
        excluir: 'Cotação excluída com sucesso',
        restaurar: 'Cotação restaurada com sucesso',
      };
      toast.success(messages[confirmDialog.action]);
      refetch();
    }

    setConfirmDialog({ open: false, action: null, cotacao: null });
  };

  const getConfirmDialogContent = () => {
    const contents: Record<string, { title: string; description: string }> = {
      arquivar: {
        title: 'Arquivar Cotação',
        description: 'Tem certeza que deseja arquivar esta cotação? Ela será movida para o arquivo e não aparecerá mais na lista principal.',
      },
      bloquear: {
        title: 'Bloquear Cotação',
        description: 'Tem certeza que deseja bloquear esta cotação? Cotações bloqueadas não podem ser editadas ou aprovadas.',
      },
      quarentena: {
        title: 'Mover para Quarentena',
        description: 'Tem certeza que deseja mover esta cotação para quarentena? Ela ficará em análise até que seja liberada.',
      },
      excluir: {
        title: 'Excluir Cotação',
        description: 'Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.',
      },
      restaurar: {
        title: 'Restaurar Cotação',
        description: 'Tem certeza que deseja restaurar esta cotação? Ela voltará ao status "Novo".',
      },
    };

    return contents[confirmDialog.action || ''] || { title: '', description: '' };
  };

  const isRestrictedStatus = (status: CotacaoStatus) => {
    return ['arquivado', 'bloqueado', 'quarentena'].includes(status);
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
                {Object.entries(cotacaoStatusLabels).map(([value, label]) => {
                  // Only show admin statuses to admins
                  if (['arquivado', 'bloqueado', 'quarentena'].includes(value) && !isAdmin) {
                    return null;
                  }
                  return (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  );
                })}
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
                    <TableRow key={cotacao.id} className={isRestrictedStatus(cotacao.status) ? 'opacity-60' : ''}>
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
                        <div className="flex justify-end gap-1">
                          {!isRestrictedStatus(cotacao.status) && (
                            <>
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
                            </>
                          )}
                          
                          {/* Admin Actions Dropdown */}
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isRestrictedStatus(cotacao.status) ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => onViewCotacao(cotacao)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({ open: true, action: 'restaurar', cotacao })}
                                      className="text-green-600"
                                    >
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Restaurar
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({ open: true, action: 'arquivar', cotacao })}
                                    >
                                      <Archive className="mr-2 h-4 w-4" />
                                      Arquivar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({ open: true, action: 'bloquear', cotacao })}
                                    >
                                      <Lock className="mr-2 h-4 w-4" />
                                      Bloquear
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({ open: true, action: 'quarentena', cotacao })}
                                    >
                                      <AlertTriangle className="mr-2 h-4 w-4" />
                                      Quarentena
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({ open: true, action: 'excluir', cotacao })}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, cotacao: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
