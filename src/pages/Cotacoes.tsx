import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAccessLogger } from '@/hooks/useAccessLogger';
import { useCotacoes } from '@/hooks/useCotacoes';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CotacaoForm from '@/components/cotacao/CotacaoForm';
import CotacaoList from '@/components/cotacao/CotacaoList';
import CotacaoDetail from '@/components/cotacao/CotacaoDetail';
import type { Cotacao } from '@/types/cotacao';

type ViewMode = 'list' | 'new' | 'detail';

export default function Cotacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { cotacoes, isLoading, refetch } = useCotacoes();
  const { logViewList } = useAccessLogger();

  // Permissões granulares com fallback por role
  const { canAccessPage, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModuleAccess('cotacoes');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [leadData, setLeadData] = useState<{ id?: string; nome?: string } | null>(null);

  useEffect(() => {
    document.title = 'Cotações | Harmony Agro';
  }, []);

  // Verificar se veio de um Lead
  useEffect(() => {
    const state = location.state as { leadId?: string; leadNome?: string } | null;
    if (state?.leadId) {
      setLeadData({ id: state.leadId, nome: state.leadNome });
      setViewMode('new');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Log de acesso
  useEffect(() => {
    if (viewMode === 'list' && cotacoes.length > 0) {
      logViewList('cotacao', cotacoes.length, {});
    }
  }, [viewMode, cotacoes.length, logViewList]);

  // Loading
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

  const handleAddContato = (cotacao: Cotacao) => {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header apenas na lista */}
        {viewMode === 'list' && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
            <p className="text-muted-foreground">
              Gerencie suas cotações e acompanhe o funil de vendas
            </p>
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'list' && (
          <CotacaoList
            cotacoes={cotacoes as any}
            isLoading={isLoading}
            onNewCotacao={handleNewCotacao}
            onViewCotacao={handleViewCotacao}
            onAddContato={handleAddContato}
          />
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
    </DashboardLayout>
  );
}
