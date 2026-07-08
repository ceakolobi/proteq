import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAccessLogger } from '@/hooks/useAccessLogger';
import { useCotacoes } from '@/hooks/useCotacoes';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import CotacaoForm from '@/components/cotacao/CotacaoForm';
import CotacaoList from '@/components/cotacao/CotacaoList';
import CotacaoDetail from '@/components/cotacao/CotacaoDetail';
import type { Cotacao } from '@/types/cotacao';
import { cotacaoStatusLabels, cotacaoStatusColors, tipoBemLabels } from '@/types/cotacao';
import { supabase } from '@/integrations/supabase/client';
import { Globe, ArrowRightLeft, Trash2, Eye, Search } from 'lucide-react';

type ViewMode = 'list' | 'new' | 'detail';

export default function Cotacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { cotacoes, isLoading, refetch, deleteCotacao, migrarCotacao } = useCotacoes();
  const { logViewList } = useAccessLogger();
  const { isAdminPrincipal } = useAuth();
  const { regioes } = useReferenceData({ loadRegioes: true });

  const { canAccessPage, canDelete, isLoading: permissionsLoading } = useModuleAccess('cotacoes');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [leadData, setLeadData] = useState<{ id?: string; nome?: string } | null>(null);

  // Gestão cotações do site
  const [consultores, setConsultores] = useState<{ id: string; nome_completo: string }[]>([]);
  const [migrarTarget, setMigrarTarget] = useState<any | null>(null);
  const [novoConsultorId, setNovoConsultorId] = useState('');
  const [novaRegiaoId, setNovaRegiaoId] = useState('');
  const [isMigrando, setIsMigrando] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [searchSite, setSearchSite] = useState('');

  const cotacoesDoSite = (cotacoes as any[]).filter(c => c.origem === 'site');
  const cotacoesDoSiteFiltradas = cotacoesDoSite.filter(c => {
    const term = searchSite.toLowerCase();
    return !term ||
      c.cliente_nome?.toLowerCase().includes(term) ||
      c.marca?.toLowerCase().includes(term) ||
      c.modelo?.toLowerCase().includes(term) ||
      c.lead_nome?.toLowerCase().includes(term);
  });

  useEffect(() => {
    document.title = 'Cotações | Harmony Agro';
  }, []);

  useEffect(() => {
    const state = location.state as { leadId?: string; leadNome?: string } | null;
    if (state?.leadId) {
      setLeadData({ id: state.leadId, nome: state.leadNome });
      setViewMode('new');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (viewMode === 'list' && cotacoes.length > 0) {
      logViewList('cotacao', cotacoes.length, {});
    }
  }, [viewMode, cotacoes.length, logViewList]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nome_completo')
      .order('nome_completo')
      .then(({ data }) => { if (data) setConsultores(data); });
  }, []);

  if (isChecking || permissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Redirecionando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Cotações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const handleNewCotacao = () => {
    setSelectedCotacao(null);
    setLeadData(null);
    setViewMode('new');
  };

  const handleViewCotacao = (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao as any);
    setViewMode('detail');
  };

  const handleFormSuccess = (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao as any);
    setViewMode('detail');
    refetch();
  };

  const handleBack = () => {
    setSelectedCotacao(null);
    setLeadData(null);
    setViewMode('list');
    refetch();
  };

  const handleConfirmMigrar = async () => {
    if (!migrarTarget || !novoConsultorId) return;
    setIsMigrando(true);
    const ok = await migrarCotacao(migrarTarget.id, novoConsultorId, novaRegiaoId || null);
    setIsMigrando(false);
    if (ok) setMigrarTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCotacao(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {viewMode === 'list' && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
            <p className="text-muted-foreground">
              Gerencie suas cotações e acompanhe o funil de vendas
            </p>
          </div>
        )}

        {viewMode === 'list' && (
          <Tabs defaultValue="todas">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="site" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Do Site
                {cotacoesDoSite.length > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 leading-5">
                    {cotacoesDoSite.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas">
              <CotacaoList
                cotacoes={cotacoes as any}
                isLoading={isLoading}
                onNewCotacao={handleNewCotacao}
                onViewCotacao={handleViewCotacao}
                onAddContato={handleViewCotacao}
              />
            </TabsContent>

            <TabsContent value="site" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Cotações do Site
                      </CardTitle>
                      <CardDescription>
                        Geradas pelo funil público — migre para um consultor para trabalhar o lead
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente ou veículo..."
                        className="pl-10"
                        value={searchSite}
                        onChange={e => setSearchSite(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : cotacoesDoSiteFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchSite ? 'Nenhuma cotação encontrada.' : 'Nenhuma cotação do site ainda.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Veículo</TableHead>
                            <TableHead>Valor FIPE</TableHead>
                            <TableHead>Mensalidade</TableHead>
                            <TableHead>Consultor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cotacoesDoSiteFiltradas.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {new Date(c.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{c.cliente_nome || c.lead_nome || '—'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {c.cliente_whatsapp || c.lead_telefone || ''}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>{c.marca} {c.modelo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {tipoBemLabels[c.tipo_bem as keyof typeof tipoBemLabels] || c.tipo_bem} • {c.ano_fabricacao}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {c.valor_fipe
                                  ? `R$ ${Number(c.valor_fipe).toLocaleString('pt-BR')}`
                                  : '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {c.mensalidade
                                  ? `R$ ${Number(c.mensalidade).toFixed(2)}`
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {c.consultor_nome
                                  ? <span className="text-sm">{c.consultor_nome}</span>
                                  : <Badge variant="outline" className="text-xs">Sem consultor</Badge>}
                              </TableCell>
                              <TableCell>
                                <Badge className={cotacaoStatusColors[c.status as keyof typeof cotacaoStatusColors] || ''}>
                                  {cotacaoStatusLabels[c.status as keyof typeof cotacaoStatusLabels] || c.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost" size="icon"
                                    title="Abrir detalhes / editar"
                                    onClick={() => handleViewCotacao(c)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon"
                                    title="Migrar para consultor / regional"
                                    onClick={() => {
                                      setMigrarTarget(c);
                                      setNovoConsultorId(c.consultor_id || '');
                                      setNovaRegiaoId(c.regiao_id || '');
                                    }}
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                  </Button>
                                  {(isAdminPrincipal || canDelete) && (
                                    <Button
                                      variant="ghost" size="icon"
                                      title="Excluir cotação"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteTarget(c)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {viewMode === 'new' && (
          <CotacaoForm
            leadId={leadData?.id}
            leadNome={leadData?.nome}
            onSuccess={handleFormSuccess}
            onCancel={handleBack}
          />
        )}

        {viewMode === 'detail' && selectedCotacao && (
          <CotacaoDetail
            cotacao={selectedCotacao as any}
            onBack={handleBack}
            onUpdate={refetch}
          />
        )}
      </div>

      {/* Modal: Migrar cotação para consultor/regional */}
      <Dialog open={!!migrarTarget} onOpenChange={open => { if (!open) setMigrarTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migrar Cotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Atribua esta cotação a um consultor. Ele passará a ver o lead no painel e poderá trabalhar a venda.
            </p>
            <div className="space-y-2">
              <Label>Consultor responsável *</Label>
              <Select value={novoConsultorId} onValueChange={setNovoConsultorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um consultor" />
                </SelectTrigger>
                <SelectContent>
                  {consultores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regional (opcional)</Label>
              <Select
                value={novaRegiaoId || '__none__'}
                onValueChange={v => setNovaRegiaoId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma regional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {regioes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrarTarget(null)}>Cancelar</Button>
            <Button onClick={handleConfirmMigrar} disabled={!novoConsultorId || isMigrando}>
              {isMigrando ? 'Migrando...' : 'Migrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: Excluir cotação */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cotação de{' '}
              <strong>{deleteTarget?.cliente_nome || deleteTarget?.lead_nome || 'este cliente'}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleConfirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
