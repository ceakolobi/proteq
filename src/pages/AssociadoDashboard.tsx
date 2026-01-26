import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, 
  Shield, 
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { associateStatusLabels, vehicleStatusLabels, AssociateStatus, VehicleStatus } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AssociadoData {
  id: string;
  nome_completo: string;
  status: AssociateStatus;
  termos_aceitos: boolean;
  termos_aceitos_em: string | null;
  created_at: string;
}

interface VeiculoData {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  veiculo_status: VehicleStatus | null;
  protecao_ativa: boolean;
  protecao_ativada_em: string | null;
  mensalidade: number;
}

interface MensalidadeData {
  id: string;
  valor: number;
  data_vencimento: string;
  status: string;
}

export default function AssociadoDashboard() {
  const { profile, user } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [veiculos, setVeiculos] = useState<VeiculoData[]>([]);
  const [proximaMensalidade, setProximaMensalidade] = useState<MensalidadeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAllowed || isChecking || !user) return;

    const fetchAssociadoData = async () => {
      try {
        // Busca dados do associado pelo user_id
        const { data: associadoData, error: associadoError } = await supabase
          .from('associados')
          .select('id, nome_completo, status, termos_aceitos, termos_aceitos_em, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (associadoError) {
          console.error('Error fetching associado:', associadoError);
          return;
        }

        if (associadoData) {
          setAssociado(associadoData as AssociadoData);

          // Busca veículos do associado
          const { data: veiculosData, error: veiculosError } = await supabase
            .from('veiculos')
            .select('id, marca, modelo, ano, placa, veiculo_status, protecao_ativa, protecao_ativada_em, mensalidade')
            .eq('associado_id', associadoData.id);

          if (!veiculosError && veiculosData) {
            setVeiculos(veiculosData as VeiculoData[]);
          }

          // Busca próxima mensalidade
          const { data: mensalidadeData, error: mensalidadeError } = await supabase
            .from('mensalidades')
            .select('id, valor_final, data_vencimento, status')
            .eq('associado_id', associadoData.id)
            .in('status', ['A VENCER', 'ATRASADO'])
            .order('data_vencimento', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!mensalidadeError && mensalidadeData) {
            setProximaMensalidade({
              id: mensalidadeData.id,
              valor: mensalidadeData.valor_final ?? 0,
              data_vencimento: mensalidadeData.data_vencimento,
              status: mensalidadeData.status ?? ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssociadoData();
  }, [isAllowed, isChecking, user]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const getStatusBadgeVariant = (status: AssociateStatus) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'inadimplente': return 'destructive';
      case 'suspenso': return 'secondary';
      case 'cancelado': return 'outline';
      default: return 'secondary';
    }
  };

  const veiculosProtegidos = veiculos.filter(v => v.protecao_ativa).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minha Área</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo, {profile?.nome_completo?.split(' ')[0] || 'Associado'}!
          </p>
          {associado && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant={getStatusBadgeVariant(associado.status)}>
                {associateStatusLabels[associado.status]}
              </Badge>
              {associado.termos_aceitos && (
                <Badge variant="outline" className="border-primary text-primary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Termo Assinado
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Veículos Protegidos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Veículos Protegidos
              </CardTitle>
              <Shield className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? '-' : veiculosProtegidos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {veiculos.length} veículo(s) cadastrado(s)
              </p>
            </CardContent>
          </Card>

          {/* Próximo Vencimento */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximo Vencimento
              </CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-3xl font-bold">-</div>
              ) : proximaMensalidade ? (
                <>
                  <div className="text-2xl font-bold">
                    {format(new Date(proximaMensalidade.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-semibold text-primary">
                      R$ {proximaMensalidade.valor.toFixed(2)}
                    </span>
                    <Badge variant={proximaMensalidade.status === 'ATRASADO' ? 'destructive' : 'secondary'}>
                      {proximaMensalidade.status}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma mensalidade pendente</div>
              )}
            </CardContent>
          </Card>

          {/* Membro Desde */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Membro Desde
              </CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading || !associado ? '-' : format(new Date(associado.created_at), 'MMMM yyyy', { locale: ptBR })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meus Veículos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Meus Veículos
            </CardTitle>
            <CardDescription>Veículos cadastrados na sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse text-muted-foreground">Carregando...</div>
            ) : veiculos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum veículo cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {veiculos.map((veiculo) => (
                  <Card key={veiculo.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{veiculo.marca} {veiculo.modelo}</p>
                          <p className="text-sm text-muted-foreground">
                            Ano {veiculo.ano} • Placa {veiculo.placa}
                          </p>
                        </div>
                        {veiculo.protecao_ativa ? (
                          <Badge variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            Protegido
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {vehicleStatusLabels[veiculo.veiculo_status || 'cadastrado']}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-sm">
                          Mensalidade: <span className="font-semibold text-primary">R$ {veiculo.mensalidade.toFixed(2)}</span>
                        </p>
                        {veiculo.protecao_ativada_em && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ativo desde {format(new Date(veiculo.protecao_ativada_em), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avisos / Alertas */}
        {associado?.status === 'inadimplente' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Atenção: Situação Financeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identificamos pendências no seu cadastro. Entre em contato para regularizar sua situação e manter sua proteção ativa.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em caso de sinistro ou dúvidas, entre em contato com nossa central de atendimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
