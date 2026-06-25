import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EmilyChat } from '@/components/emily/EmilyChat';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, 
  Shield, 
  CreditCard,
  FileText,
  Camera,
  Bell,
  BookOpen,
  MapPin,
  MessageCircle,
  Download,
  Eye,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { AssociateStatus, VehicleStatus } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBrand } from '@/hooks/useBrand';

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

interface VistoriaData {
  id: string;
  status: string;
}

type ProtectionStatus = 'ativa' | 'aguardando_pagamento' | 'suspensa';

export default function AssociadoDashboard() {
  const { profile, user } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { brand } = useBrand();
  
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [veiculo, setVeiculo] = useState<VeiculoData | null>(null);
  const [proximaMensalidade, setProximaMensalidade] = useState<MensalidadeData | null>(null);
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAllowed || isChecking || !user) return;

    const fetchAssociadoData = async () => {
      try {
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

          // Busca primeiro veículo do associado
          const { data: veiculosData, error: veiculosError } = await supabase
            .from('veiculos')
            .select('id, marca, modelo, ano, placa, veiculo_status, protecao_ativa, protecao_ativada_em, mensalidade')
            .eq('associado_id', associadoData.id)
            .limit(1)
            .maybeSingle();

          if (!veiculosError && veiculosData) {
            setVeiculo(veiculosData as VeiculoData);

            // Busca vistoria do veículo
            const { data: vistoriaData } = await supabase
              .from('vistorias')
              .select('id, status')
              .eq('veiculo_id', veiculosData.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (vistoriaData) {
              setVistoria(vistoriaData as VistoriaData);
            }
          }

          // Busca próxima mensalidade
          const { data: mensalidadeData, error: mensalidadeError } = await supabase
            .from('mensalidades')
            .select('id, valor_final, data_vencimento, status')
            .eq('associado_id', associadoData.id)
            .in('status', ['A VENCER', 'ATRASADO', 'pendente', 'a_vencer'])
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

  // Determina status da proteção
  const getProtectionStatus = (): ProtectionStatus => {
    if (associado?.status === 'suspenso' || associado?.status === 'cancelado') return 'suspensa';
    if (associado?.status === 'inadimplente') return 'aguardando_pagamento';
    if (veiculo?.protecao_ativa) return 'ativa';
    return 'aguardando_pagamento';
  };

  const protectionStatus = getProtectionStatus();

  const getStatusConfig = (status: ProtectionStatus) => {
    switch (status) {
      case 'ativa':
        return { 
          label: 'Ativa', 
          color: 'text-green-600', 
          bgColor: 'bg-green-100',
          icon: CheckCircle2 
        };
      case 'aguardando_pagamento':
        return { 
          label: 'Aguardando Pagamento', 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-100',
          icon: Clock 
        };
      case 'suspensa':
        return { 
          label: 'Suspensa', 
          color: 'text-red-600', 
          bgColor: 'bg-red-100',
          icon: AlertCircle 
        };
    }
  };

  const statusConfig = getStatusConfig(protectionStatus);
  const StatusIcon = statusConfig.icon;
  const firstName = profile?.nome_completo?.split(' ')[0] || associado?.nome_completo?.split(' ')[0] || 'Associado';

  const getVistoriaStatus = () => {
    if (!vistoria) return { label: 'Pendente', color: 'text-yellow-600' };
    switch (vistoria.status) {
      case 'aprovada': return { label: 'Aprovada', color: 'text-green-600' };
      case 'reprovada': return { label: 'Reprovada', color: 'text-red-600' };
      case 'pendente': return { label: 'Pendente', color: 'text-yellow-600' };
      default: return { label: 'Em análise', color: 'text-blue-600' };
    }
  };

  const vistoriaStatus = getVistoriaStatus();

  const quickActions = [
    { icon: FileText, label: 'Ver contrato', onClick: () => {} },
    { icon: Camera, label: 'Enviar vistoria', onClick: () => {} },
    { icon: CreditCard, label: '2ª via de boleto', onClick: () => {} },
    { icon: Bell, label: 'Notificações', onClick: () => {} },
    { icon: BookOpen, label: 'Regulamento', onClick: () => {} },
    { icon: MapPin, label: 'Rastreamento', onClick: () => {} },
    { icon: MessageCircle, label: 'Falar com suporte', onClick: () => {} },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">
            👋 Olá, {firstName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-muted-foreground">Status da Proteção:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card: Meu Veículo */}
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Meu Veículo</h3>
                </div>
                
                {isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : veiculo ? (
                  <div className="space-y-2">
                    <p className="text-foreground font-medium">
                      {veiculo.marca} {veiculo.modelo}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Placa: <span className="font-mono">{veiculo.placa}</span>
                    </p>
                    <p className="text-sm">
                      Situação: <span className={veiculo.protecao_ativa ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                        {veiculo.protecao_ativa ? 'Protegido' : 'Aguardando'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum veículo cadastrado</p>
                )}
                
                <Button variant="ghost" size="sm" className="mt-4 w-full justify-between text-primary hover:text-primary">
                  Ver detalhes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Card: Situação Financeira */}
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-green-100">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Situação Financeira</h3>
                </div>
                
                {isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Adesão: <span className="text-green-600 font-medium">Paga</span>
                    </p>
                    <p className="text-sm">
                      Mensalidade: <span className={proximaMensalidade?.status?.includes('ATRASADO') || proximaMensalidade?.status === 'atrasada' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {proximaMensalidade?.status?.includes('ATRASADO') || proximaMensalidade?.status === 'atrasada' ? 'Atrasada' : 'Em dia'}
                      </span>
                    </p>
                    {proximaMensalidade && (
                      <p className="text-xs text-muted-foreground">
                        Próx. vencimento: {format(new Date(proximaMensalidade.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
                
                <Button variant="ghost" size="sm" className="mt-4 w-full justify-between text-primary hover:text-primary">
                  2ª via de boleto
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Card: Contrato */}
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Contrato</h3>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    Status: <span className={associado?.termos_aceitos ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                      {associado?.termos_aceitos ? 'Assinado' : 'Pendente'}
                    </span>
                  </p>
                  {associado?.termos_aceitos_em && (
                    <p className="text-xs text-muted-foreground">
                      Assinado em: {format(new Date(associado.termos_aceitos_em), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" className="flex-1 text-primary hover:text-primary">
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-primary hover:text-primary">
                    <Download className="h-4 w-4 mr-1" />
                    Baixar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card: Vistoria */}
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-purple-100">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Vistoria</h3>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    Status: <span className={`font-medium ${vistoriaStatus.color}`}>
                      {vistoriaStatus.label}
                    </span>
                  </p>
                </div>
                
                <Button variant="ghost" size="sm" className="mt-4 w-full justify-between text-primary hover:text-primary">
                  Enviar vistoria
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                ⚡ Ações Rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-3 px-4 flex flex-col items-center gap-2 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                    onClick={action.onClick}
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium text-center">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer com cor azul escuro */}
      <footer
        className="py-6 px-4 text-center"
        style={{ backgroundColor: 'hsl(230, 70%, 18%)' }}
      >
        <p className="text-white/80 text-sm">
          © {new Date().getFullYear()} {brand?.name || 'Harmony Clube de Benefícios'}. Todos os direitos reservados.
        </p>
      </footer>

      {/* Emily — Assistente do associado com acesso aos dados reais */}
      {associado?.id && (
        <EmilyChat
          context="associado"
          associadoId={associado.id}
          userId={user?.id}
        />
      )}
    </div>
  );
}
