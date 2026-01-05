import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Search, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  mensalidadeStatusLabels, 
  mensalidadeStatusColors,
  formaPagamentoOptions,
  type MensalidadeStatus 
} from '@/types/financeiro';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
};

export default function Mensalidades() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('admin_or_basico');
  const { roles, isAdminPrincipal } = useAuth();
  const { mensalidades, loading, fetchMensalidades, registrarPagamento, alterarStatusMensalidade } = useFinanceiro();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [mesFilter, setMesFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedMensalidade, setSelectedMensalidade] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    forma_pagamento: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [newStatus, setNewStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const canManage = isAdminPrincipal || roles.includes('financeiro');

  useEffect(() => {
    if (!isChecking && isAllowed) {
      fetchMensalidades({ 
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        mesReferencia: mesFilter ? `${mesFilter}-01` : undefined 
      });
    }
  }, [isChecking, isAllowed, statusFilter, mesFilter, fetchMensalidades]);

  const filteredMensalidades = mensalidades.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.associado_nome?.toLowerCase().includes(term) ||
      m.veiculo_placa?.toLowerCase().includes(term)
    );
  });

  const handleOpenPaymentDialog = (mensalidade: any) => {
    setSelectedMensalidade(mensalidade);
    setPaymentData({
      forma_pagamento: '',
      data_pagamento: new Date().toISOString().split('T')[0],
      observacoes: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const handleOpenStatusDialog = (mensalidade: any) => {
    setSelectedMensalidade(mensalidade);
    setNewStatus(mensalidade.status);
    setIsStatusDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedMensalidade || !paymentData.forma_pagamento) {
      toast.error('Preencha a forma de pagamento');
      return;
    }

    setIsSaving(true);
    const result = await registrarPagamento(
      selectedMensalidade.id,
      paymentData.forma_pagamento,
      paymentData.data_pagamento,
      paymentData.observacoes
    );

    if (result.success) {
      toast.success('Pagamento registrado com sucesso!');
      setIsPaymentDialogOpen(false);
      fetchMensalidades({ 
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        mesReferencia: mesFilter ? `${mesFilter}-01` : undefined 
      });
    } else {
      toast.error('Erro ao registrar pagamento');
    }
    setIsSaving(false);
  };

  const handleSaveStatus = async () => {
    if (!selectedMensalidade || !newStatus) return;

    setIsSaving(true);
    const result = await alterarStatusMensalidade(selectedMensalidade.id, newStatus);

    if (result.success) {
      toast.success('Status atualizado com sucesso!');
      setIsStatusDialogOpen(false);
      fetchMensalidades({ 
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        mesReferencia: mesFilter ? `${mesFilter}-01` : undefined 
      });
    } else {
      toast.error('Erro ao atualizar status');
    }
    setIsSaving(false);
  };

  const getStatusIcon = (status: MensalidadeStatus) => {
    switch (status) {
      case 'paga': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'atrasada': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'a_vencer': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'cancelada': return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'isento': return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
      case 'suspensa': return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
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
                <Calendar className="h-6 w-6 text-primary" />
                Mensalidades
              </h1>
              <p className="text-muted-foreground">
                Gestão de cobranças mensais
              </p>
            </div>
          </div>
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
                <Label>Mês de Referência</Label>
                <Input
                  type="month"
                  value={mesFilter}
                  onChange={(e) => setMesFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="a_vencer">A Vencer</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                    <SelectItem value="isento">Isento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => fetchMensalidades({ 
                    status: statusFilter !== 'todos' ? statusFilter : undefined,
                    mesReferencia: mesFilter ? `${mesFilter}-01` : undefined 
                  })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Mensalidades */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associado</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMensalidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma mensalidade encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMensalidades.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.associado_nome || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{m.veiculo_placa}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{m.veiculo_modelo}</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(m.mes_referencia), 'MMM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {formatDate(m.data_vencimento)}
                          {m.dias_atraso > 0 && (
                            <span className="text-xs text-red-500 block">
                              {m.dias_atraso} dias de atraso
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(m.valor_final)}
                        </TableCell>
                        <TableCell>
                          <Badge className={mensalidadeStatusColors[m.status as MensalidadeStatus]}>
                            {getStatusIcon(m.status as MensalidadeStatus)}
                            <span className="ml-1">{mensalidadeStatusLabels[m.status as MensalidadeStatus]}</span>
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {m.status !== 'paga' && m.status !== 'cancelada' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenPaymentDialog(m)}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenStatusDialog(m)}
                              >
                                Alterar
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Pagamento */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Registrar Pagamento
              </DialogTitle>
              <DialogDescription>
                {selectedMensalidade && (
                  <>
                    {selectedMensalidade.associado_nome} - {selectedMensalidade.veiculo_placa}
                    <br />
                    Valor: <strong>{formatCurrency(selectedMensalidade.valor_final)}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select
                  value={paymentData.forma_pagamento}
                  onValueChange={(value) => setPaymentData({ ...paymentData, forma_pagamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formaPagamentoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={paymentData.data_pagamento}
                  onChange={(e) => setPaymentData({ ...paymentData, data_pagamento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações opcionais..."
                  value={paymentData.observacoes}
                  onChange={(e) => setPaymentData({ ...paymentData, observacoes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePayment} disabled={isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Alteração de Status */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status</DialogTitle>
              <DialogDescription>
                {selectedMensalidade && (
                  <>
                    {selectedMensalidade.associado_nome} - {selectedMensalidade.veiculo_placa}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Novo Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vencer">A Vencer</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                    <SelectItem value="isento">Isento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveStatus} disabled={isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
