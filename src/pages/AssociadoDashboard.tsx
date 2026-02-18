import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Phone,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Eye
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

interface CotacaoAssociado {
  id: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  valor_bem: number;
  mensalidade: number | null;
  participacao: number | null;
  status: string;
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

type ProtectionStatus = 'ativa' | 'aguardando_pagamento' | 'suspensa';

export default function AssociadoDashboard() {
  const { profile, user } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { brand } = useBrand();
  
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [veiculo, setVeiculo] = useState<VeiculoData | null>(null);
  const [proximaMensalidade, setProximaMensalidade] = useState<MensalidadeData | null>(null);
  const [cotacoes, setCotacoes] = useState<CotacaoAssociado[]>([]);
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

          const { data: veiculosData } = await supabase
            .from('veiculos')
            .select('id, marca, modelo, ano, placa, veiculo_status, protecao_ativa, protecao_ativada_em, mensalidade')
            .eq('associado_id', associadoData.id)
            .limit(1)
            .maybeSingle();

          if (veiculosData) {
            setVeiculo(veiculosData as VeiculoData);
          }

          const { data: mensalidadeData } = await supabase
            .from('mensalidades')
            .select('id, valor_final, data_vencimento, status')
            .eq('associado_id', associadoData.id)
            .in('status', ['A VENCER', 'ATRASADO', 'pendente', 'a_vencer'])
            .order('data_vencimento', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (mensalidadeData) {
            setProximaMensalidade({
              id: mensalidadeData.id,
              valor: mensalidadeData.valor_final ?? 0,
              data_vencimento: mensalidadeData.data_vencimento,
              status: mensalidadeData.status ?? ''
            });
          }
        }

        if (user?.email) {
          const { data: cotacoesData } = await supabase
            .from('cotacoes')
            .select('id, marca, modelo, ano_fabricacao, valor_bem, mensalidade, participacao, status, created_at')
            .eq('cliente_email', user.email)
            .order('created_at', { ascending: false })
            .limit(5);

          if (cotacoesData) {
            setCotacoes(cotacoesData as CotacaoAssociado[]);
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

  if (!isAllowed) return null;

  const getProtectionStatus = (): ProtectionStatus => {
    if (associado?.status === 'suspenso' || associado?.status === 'cancelado') return 'suspensa';
    if (associado?.status === 'inadimplente') return 'aguardando_pagamento';
    if (veiculo?.protecao_ativa) return 'ativa';
    return 'aguardando_pagamento';
  };

  const protectionStatus = getProtectionStatus();
  const firstName = profile?.nome_completo?.split(' ')[0] || associado?.nome_completo?.split(' ')[0] || 'Associado';

  const isMensalidadeAtrasada = proximaMensalidade?.status?.includes('ATRASADO') || proximaMensalidade?.status === 'atrasada';

  const serviceItems = [
    { icon: FileText, label: 'Cotação', href: '#' },
    { icon: Camera, label: 'Enviar Vistoria', href: '#' },
    { icon: CreditCard, label: '2ª Via de Boleto', href: '#' },
    { icon: Eye, label: 'Ver Contrato', href: '#' },
    { icon: BookOpen, label: 'Regulamento', href: '#' },
    { icon: MapPin, label: 'Rastreamento', href: '#' },
    { icon: Bell, label: 'Notificações', href: '#' },
    { icon: MessageCircle, label: 'Falar com Suporte', href: '#' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* ── Header com gradiente ── */}
      <div className="relative bg-primary px-5 pt-12 pb-24 rounded-b-[2rem] overflow-hidden">
        {/* Overlay gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/60" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-primary-foreground">
            Olá, {firstName}!
          </h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {brand?.name || 'Harmony Clube de Benefícios'}
          </p>
        </div>
      </div>

      {/* ── Card Veículo (sobrepondo o header) ── */}
      <div className="px-4 -mt-16 relative z-10">
        <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            {/* Área da imagem do veículo */}
            <div className="bg-muted/50 flex items-center justify-center py-6 px-4">
              {isLoading ? (
                <div className="h-28 w-full animate-pulse bg-muted rounded" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <Car className="h-10 w-10 text-secondary" />
                  </div>
                </div>
              )}
            </div>

            {/* Info do veículo */}
            <div className="p-5 text-center">
              <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Meu Veículo</h2>
              {veiculo ? (
                <>
                  <p className="text-lg font-bold text-foreground">{veiculo.marca} {veiculo.modelo} {veiculo.ano}</p>
                  <p className="text-sm text-muted-foreground font-mono tracking-wider">{veiculo.placa}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Botões de ação rápida ── */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Button className="h-14 rounded-2xl text-sm font-semibold gap-2 shadow-sm">
          <Phone className="h-4 w-4" />
          Assistência 24h
        </Button>
        <Button variant="outline" className="h-14 rounded-2xl text-sm font-semibold gap-2 shadow-sm border-border bg-card">
          <Shield className="h-4 w-4 text-primary" />
          Visualizar Plano
        </Button>
      </div>

      {/* ── Status da mensalidade ── */}
      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="h-14 animate-pulse bg-muted rounded-2xl" />
        ) : (
          <div className={`flex items-center justify-between px-5 py-4 rounded-2xl font-semibold text-sm ${
            isMensalidadeAtrasada 
              ? 'bg-destructive/10 text-destructive' 
              : protectionStatus === 'ativa' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
          }`}>
            <div className="flex items-center gap-2">
              {protectionStatus === 'ativa' && <CheckCircle2 className="h-5 w-5" />}
              {protectionStatus === 'aguardando_pagamento' && <Clock className="h-5 w-5" />}
              {protectionStatus === 'suspensa' && <AlertCircle className="h-5 w-5" />}
              <span>
                {isMensalidadeAtrasada 
                  ? 'Mensalidade atrasada' 
                  : protectionStatus === 'ativa' 
                    ? 'Mensalidade em dia' 
                    : protectionStatus === 'suspensa' 
                      ? 'Proteção suspensa' 
                      : 'Aguardando pagamento'}
              </span>
            </div>
            {proximaMensalidade && (
              <span className="text-xs opacity-70">
                Venc. {format(new Date(proximaMensalidade.data_vencimento), 'dd/MM', { locale: ptBR })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Cotações pendentes ── */}
      {cotacoes.length > 0 && (
        <div className="px-4 mt-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Minhas Cotações
          </h3>
          <div className="space-y-2">
            {cotacoes.slice(0, 3).map((cot) => {
              const statusLabel: Record<string, string> = {
                aceita: 'Aceita', novo: 'Em análise', aprovado: 'Aprovada',
                aguardando_docs: 'Aguardando docs', adesao_concluida: 'Concluída', enviada: 'Enviada',
              };
              const statusColor: Record<string, string> = {
                aceita: 'text-primary bg-primary/10', aprovado: 'text-primary bg-primary/10',
                adesao_concluida: 'text-primary bg-primary/10', aguardando_docs: 'text-muted-foreground bg-muted',
                enviada: 'text-secondary bg-secondary/10', novo: 'text-secondary bg-secondary/10',
              };
              return (
                <Card key={cot.id} className="rounded-xl border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{cot.marca} {cot.modelo}</p>
                      <p className="text-xs text-muted-foreground">{cot.ano_fabricacao}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[cot.status] || 'text-muted-foreground bg-muted'}`}>
                      {statusLabel[cot.status] || cot.status}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Serviços ── */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-foreground mb-3">Serviços</h3>
        <Card className="rounded-2xl divide-y divide-border">
          {serviceItems.map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      </div>

      {/* Espaço pro bottom nav */}
      <div className="h-4" />
    </div>
  );
}
