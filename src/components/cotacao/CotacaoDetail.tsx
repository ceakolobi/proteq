import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Car,
  DollarSign,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  MapPin,
  PhoneCall,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  FileDown,
  Send,
  User,
  Loader2,
  Camera,
  Link,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { Cotacao, CotacaoContato, CotacaoStatus, TipoContato } from '@/types/cotacao';
import { 
  cotacaoStatusLabels, 
  cotacaoStatusColors, 
  tipoBemLabels, 
  metodoValoracaoLabels,
  tipoContatoLabels,
} from '@/types/cotacao';
import { 
  isCota01, 
  getCategoriaByTipoVeiculo,
  PARTICIPACAO_MINIMA_COTA_01,
} from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';

interface CotacaoDetailProps {
  cotacao: Cotacao & { 
    lead_nome?: string; 
    regiao_nome?: string;
    cota_nome?: string;
    contatos?: CotacaoContato[];
    lead_email?: string;
    lead_telefone?: string;
    cliente_nome?: string;
    cliente_email?: string;
    cliente_whatsapp?: string;
    proposta_enviada_em?: string;
  };
  onBack: () => void;
  onUpdate: () => void;
}

export default function CotacaoDetail({ cotacao, onBack, onUpdate }: CotacaoDetailProps) {
  const { user, isAdminPrincipal, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isContatoDialogOpen, setIsContatoDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [contatoData, setContatoData] = useState({
    tipo: '' as TipoContato | '',
    descricao: '',
  });
  const [newStatus, setNewStatus] = useState<CotacaoStatus>(cotacao.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para dados do cliente
  const [clienteNome, setClienteNome] = useState(cotacao.cliente_nome || cotacao.lead_nome || '');
  const [clienteEmail, setClienteEmail] = useState(cotacao.cliente_email || cotacao.lead_email || '');
  const [clienteWhatsapp, setClienteWhatsapp] = useState(cotacao.cliente_whatsapp || cotacao.lead_telefone || '');
  const [isDadosClienteModificados, setIsDadosClienteModificados] = useState(false);
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  
  // Estados para envio de proposta
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Estados para vistoria
  const [isCreatingVistoria, setIsCreatingVistoria] = useState(false);
  const [vistoriaLink, setVistoriaLink] = useState<string | null>(null);
  const [vistoriaId, setVistoriaId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const canManage = isAdminPrincipal || hasRole('admin_regional') || cotacao.consultor_id === user?.id;
  const isAprovado = cotacao.status === 'aprovado';
  const isAceita = cotacao.status === 'aceita' || !!(cotacao as any).aceita_em;
  const canApprove = cotacao.status !== 'aprovado' && cotacao.status !== 'perdido' && canManage;

  // Marca cotação como aceita (CRM interno) — dispara vistoria automaticamente
  const handleMarcarAceita = async () => {
    if (!confirm('Confirma marcar esta cotação como ACEITA? Isso disparará o fluxo de vistoria.')) return;
    setIsAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('aceitar-cotacao', {
        body: { cotacao_id: cotacao.id, internal: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao aceitar');

      toast.success(
        data.vistoria_url
          ? 'Cotação aceita! Vistoria criada e link disponível.'
          : 'Cotação aceita!'
      );
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao aceitar cotação');
    } finally {
      setIsAccepting(false);
    }
  };

  // Copia link público de aceite para o cliente
  const handleCopyAceiteLink = () => {
    const token = (cotacao as any).aceite_token;
    if (!token) {
      toast.error('Cotação ainda não tem link de aceite. Recarregue.');
      return;
    }
    const url = `${window.location.origin}/aceitar/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de aceite copiado!');
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getContatoIcon = (tipo: TipoContato) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'retorno': return <PhoneCall className="w-4 h-4" />;
      case 'reuniao': return <Calendar className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'visita': return <MapPin className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  const handleAddContato = async () => {
    if (!contatoData.tipo || !contatoData.descricao.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cotacao_contatos')
        .insert([{
          cotacao_id: cotacao.id,
          usuario_id: user?.id,
          tipo: contatoData.tipo,
          descricao: contatoData.descricao.trim(),
        }]);

      if (error) throw error;

      toast.success('Contato registrado');
      setContatoData({ tipo: '', descricao: '' });
      setIsContatoDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar contato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status: newStatus })
        .eq('id', cotacao.id);

      if (error) throw error;

      toast.success('Status atualizado');
      setIsStatusDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // Atualizar cotação como aprovada
      const { error: cotacaoError } = await supabase
        .from('cotacoes')
        .update({
          status: 'aprovado',
          aprovada_em: new Date().toISOString(),
          aprovada_por: user?.id,
        })
        .eq('id', cotacao.id);

      if (cotacaoError) throw cotacaoError;

      // Criar proposta vinculada
      const { data: proposta, error: propostaError } = await supabase
        .from('propostas')
        .insert([{
          consultor_id: cotacao.consultor_id,
          lead_id: cotacao.lead_id || null,
          veiculo_marca: cotacao.marca,
          veiculo_modelo: cotacao.modelo,
          veiculo_ano: cotacao.ano_fabricacao,
          veiculo_tipo: cotacao.tipo_bem,
          valor_fipe: cotacao.valor_bem,
          cota_id: cotacao.cota_id || null,
          mensalidade: cotacao.mensalidade || 0,
          participacao: cotacao.participacao || 0,
          carro_reserva_dias: cotacao.carro_reserva_dias,
          carro_reserva_adicional: cotacao.carro_reserva_adicional,
          status: 'aceita',
          aceita_em: new Date().toISOString(),
        }])
        .select()
        .single();

      if (propostaError) {
        console.error('Erro ao criar proposta:', propostaError);
      } else if (proposta) {
        // Atualizar cotação com proposta_id
        await supabase
          .from('cotacoes')
          .update({ proposta_id: proposta.id })
          .eq('id', cotacao.id);
      }

      toast.success('Cotação aprovada! Processo de vistoria pode ser iniciado.');
      setIsApproveDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar cotação');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salvar dados do cliente
  const handleSaveCliente = async () => {
    setIsSavingCliente(true);
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({
          cliente_nome: clienteNome || null,
          cliente_email: clienteEmail || null,
          cliente_whatsapp: clienteWhatsapp || null,
        })
        .eq('id', cotacao.id);

      if (error) throw error;

      toast.success('Dados do cliente salvos');
      setIsDadosClienteModificados(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar dados do cliente');
    } finally {
      setIsSavingCliente(false);
    }
  };

  // Formatar número para WhatsApp
  const formatWhatsappNumber = (numero: string): string => {
    let digits = numero.replace(/\D/g, "");
    if (!digits.startsWith("55") && digits.length <= 11) {
      digits = "55" + digits;
    }
    return digits;
  };

  // Gerar PDF - redirecionar para página de layout
  const handleGerarPdf = () => {
    navigate(`/layout-cotacao-harmony?id=${cotacao.id}`);
  };

  // Enviar por e-mail - redireciona para gerar PDF primeiro
  const handleEnviarEmail = () => {
    if (!clienteEmail) {
      toast.error('Informe o e-mail do cliente para enviar a proposta');
      return;
    }
    // Redireciona para página de layout onde o PDF será gerado e pode ser enviado
    toast.info('Gerando proposta para envio por e-mail...');
    navigate(`/layout-cotacao-harmony?id=${cotacao.id}`);
  };

  // Enviar por WhatsApp
  const handleEnviarWhatsApp = () => {
    if (!clienteWhatsapp || clienteWhatsapp.replace(/\D/g, "").length < 10) {
      toast.error('Informe o WhatsApp do cliente para enviar a cotação');
      return;
    }

    const numeroFormatado = formatWhatsappNumber(clienteWhatsapp);
    const nomePrimeiro = (clienteNome || '').split(' ')[0] || 'tudo bem';
    const veiculo = `${cotacao.marca} ${cotacao.modelo}${cotacao.ano_modelo ? ` ${cotacao.ano_modelo}` : ''}`;
    const valorFipeFmt = cotacao.valor_fipe ? formatCurrency(cotacao.valor_fipe) : formatCurrency(cotacao.valor_bem);
    const mensalidadeFmt = formatCurrency(cotacao.mensalidade);
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const aceiteToken = (cotacao as any).aceite_token as string | undefined;
    const propostaUrl = aceiteToken ? `${siteUrl}/aceitar/${aceiteToken}` : siteUrl;

    const mensagem = `*Olá, ${nomePrimeiro}!* Tudo bem?

Conforme conversamos, preparei a proposta de proteção para o seu veículo. Focamos em garantir o melhor custo-benefício com a máxima segurança para você.

━━━━━━━━━━━━━━━
📋 *RESUMO DA SUA COTAÇÃO*
━━━━━━━━━━━━━━━

• *Veículo:* ${veiculo}
• *FIPE de Referência:* ${valorFipeFmt}

🔒 *COBERTURA INTEGRAL INCLUSA (Plano Base):*
• Roubo, Furto, Colisão e Incêndio (100% FIPE)
• Proteção contra Terceiros
• Fenômenos da Natureza (Granizo, Enchentes, etc.)
• Assistência 24h Padrão (Guincho, Chaveiro, Carga de Bateria)

━━━━━━━━━━━━━━━
⚡ *PERSONALIZE SUA PROTEÇÃO (Opcionais)*
━━━━━━━━━━━━━━━
_Escolha o que faz mais sentido para o seu dia a dia:_

🚗 *Carro Reserva Estendido:*
▫️ +30 dias: *R$ 39,90/mês*
▫️ +90 dias: *R$ 59,90/mês*

🛠️ *Clube de Benefícios & Oficinas:*
▫️ Descontos exclusivos em oficinas credenciadas
▫️ Km de guincho expandido
▫️ Assistência 24h ampliada

━━━━━━━━━━━━━━━
💰 *INVESTIMENTO*
━━━━━━━━━━━━━━━

*Mensalidade Base:* apenas *${mensalidadeFmt}/mês*
_(opcionais escolhidos são somados à mensalidade)_

🎁 *1ª mensalidade GRÁTIS*
✅ *SEM* taxa de adesão
✅ *SEM* análise de condutor
✅ *SEM* consulta SPC/Serasa

━━━━━━━━━━━━━━━
📲 *Como deseja prosseguir?*
━━━━━━━━━━━━━━━
1️⃣ Quero fechar o *Plano Base* agora
2️⃣ Quero incluir *opcionais* (me diga quais!)
3️⃣ Tenho *dúvidas* e quero falar com um consultor

⏳ *Validade da proposta:* 7 dias
🤝 _Conte com a gente!_`;

    const whatsappUrl = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`;
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      // Fallback quando o navegador bloqueia pop-ups
      window.location.assign(whatsappUrl);
      return;
    }

    toast.success(`Abrindo WhatsApp para ${clienteWhatsapp}`);
  };

  // ====== FUNÇÕES DE VISTORIA ======
  
  // Criar vistoria e gerar link
  const handleCriarVistoria = async (canal: 'link' | 'telefone' | 'whatsapp') => {
    if (!cotacao.veiculo_id && !cotacao.placa) {
      toast.error('Não há veículo vinculado a esta cotação');
      return;
    }

    setIsCreatingVistoria(true);
    try {
      // Verificar se já existe uma vistoria para esta cotação
      const { data: existingVistoria } = await supabase
        .from('vistorias')
        .select('id, token_acesso')
        .eq('cotacao_id', cotacao.id)
        .maybeSingle();

      if (existingVistoria) {
        // Já existe vistoria, usar o link existente
        const link = `${window.location.origin}/vistoria-publica?token=${existingVistoria.token_acesso}`;
        setVistoriaLink(link);
        setVistoriaId(existingVistoria.id);
        
        if (canal === 'link') {
          await navigator.clipboard.writeText(link);
          toast.success('Link da vistoria copiado!');
        } else if (canal === 'whatsapp') {
          handleEnviarVistoriaWhatsApp(link);
        }
        return;
      }

      // Verificar se tem veículo_id, senão precisa criar o veículo primeiro ou informar
      let veiculoId = cotacao.veiculo_id;
      
      if (!veiculoId) {
        toast.error('É necessário vincular um veículo à cotação antes de iniciar a vistoria');
        return;
      }

      // Criar nova vistoria
      const { data: novaVistoria, error } = await supabase
        .from('vistorias')
        .insert({
          veiculo_id: veiculoId,
          cotacao_id: cotacao.id,
          associado_id: cotacao.associado_id || null,
          consultor_id: cotacao.consultor_id,
          proposta_id: cotacao.proposta_id || null,
          canal_abertura: canal,
          tipo_vistoria: 'pre_adesao',
          status: 'pendente',
          solicitada_em: new Date().toISOString(),
        })
        .select('id, token_acesso')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/vistoria-publica?token=${novaVistoria.token_acesso}`;
      setVistoriaLink(link);
      setVistoriaId(novaVistoria.id);

      if (canal === 'link') {
        await navigator.clipboard.writeText(link);
        toast.success('Vistoria criada! Link copiado para a área de transferência.');
      } else if (canal === 'whatsapp') {
        handleEnviarVistoriaWhatsApp(link);
      } else if (canal === 'telefone') {
        toast.success('Vistoria criada! Agora ligue para o cliente.');
      }

      onUpdate();
    } catch (err: any) {
      console.error('Erro ao criar vistoria:', err);
      toast.error(err.message || 'Erro ao criar vistoria');
    } finally {
      setIsCreatingVistoria(false);
    }
  };

  // Enviar link de vistoria por WhatsApp
  const handleEnviarVistoriaWhatsApp = (link: string) => {
    if (!clienteWhatsapp || clienteWhatsapp.replace(/\D/g, "").length < 10) {
      toast.error('Informe o WhatsApp do cliente');
      return;
    }

    const numeroFormatado = formatWhatsappNumber(clienteWhatsapp);
    const saudacao = clienteNome ? `Olá ${clienteNome} 👋` : "Olá 👋";
    
    const mensagem = `${saudacao}, tudo bem?

Sua proposta foi *APROVADA*! 🎉

Para darmos continuidade, precisamos realizar a *vistoria do seu veículo* (${cotacao.marca} ${cotacao.modelo}).

📸 *Clique no link abaixo* para enviar as fotos:
${link}

É bem simples:
✅ Tire fotos do veículo (frente, traseira, laterais, painel)
✅ Foto do chassi
✅ Foto do documento (CRLV)

O link é válido por *7 dias*.

Qualquer dúvida, estou à disposição! 🙏

_Proteção Veicular_`;

    const whatsappUrl = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`;
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.assign(whatsappUrl);
      return;
    }

    toast.success('Abrindo WhatsApp com link de vistoria');
  };

  // Ligar para o cliente
  const handleLigarCliente = () => {
    if (!clienteWhatsapp) {
      toast.error('Informe o telefone do cliente');
      return;
    }

    const numero = clienteWhatsapp.replace(/\D/g, "");
    
    // Em mobile, abre o discador
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = `tel:+55${numero}`;
    } else {
      // Em desktop, copia o número
      navigator.clipboard.writeText(`(${numero.slice(0,2)}) ${numero.slice(2,7)}-${numero.slice(7)}`);
      toast.success('Número copiado para a área de transferência');
    }
    
    // Criar vistoria se ainda não existe (canal telefone)
    handleCriarVistoria('telefone');
  };

  // Copiar link de vistoria
  const handleCopiarLinkVistoria = async () => {
    if (vistoriaLink) {
      await navigator.clipboard.writeText(vistoriaLink);
      toast.success('Link copiado!');
    } else {
      handleCriarVistoria('link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {cotacao.marca} {cotacao.modelo}
          </h2>
          <p className="text-muted-foreground">
            {tipoBemLabels[cotacao.tipo_bem]} • {cotacao.ano_fabricacao}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${cotacaoStatusColors[cotacao.status]} text-sm`}>
            {cotacaoStatusLabels[cotacao.status]}
          </Badge>
          {canManage && !isAceita && (
            <Button
              size="sm"
              onClick={handleMarcarAceita}
              disabled={isAccepting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              Marcar Aceita
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleCopyAceiteLink}>
              <MessageCircle className="w-4 h-4 mr-1" />
              Copiar link de aceite
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info do Veículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Dados do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span>{tipoBemLabels[cotacao.tipo_bem]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marca:</span>
              <span>{cotacao.marca}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo:</span>
              <span>{cotacao.modelo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ano:</span>
              <span>{cotacao.ano_fabricacao}{cotacao.ano_modelo ? `/${cotacao.ano_modelo}` : ''}</span>
            </div>
            {cotacao.placa && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa:</span>
                <span>{cotacao.placa}</span>
              </div>
            )}
            {cotacao.chassi && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chassi:</span>
                <span className="font-mono text-xs break-all">{cotacao.chassi}</span>
              </div>
            )}
            {cotacao.categoria && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria:</span>
                <span>{cotacao.categoria}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método:</span>
              <Badge variant="outline">{metodoValoracaoLabels[cotacao.metodo_valoracao]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor do Bem:</span>
              <span className="font-semibold">{formatCurrency(cotacao.valor_bem)}</span>
            </div>
            <Separator />
            {/* Detalhamento do cálculo */}
            {(cotacao as any).valor_base && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor Base:</span>
                  <span>{formatCurrency((cotacao as any).valor_base)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ajuste Geral (R$):</span>
                  <span>{formatCurrency((cotacao as any).ajuste_geral_valor || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ajuste Individual (R$):</span>
                  <span>{formatCurrency((cotacao as any).ajuste_individual_valor || 0)}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mensalidade:</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(cotacao.mensalidade)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participação (7%):</span>
              <span>{formatCurrency(cotacao.participacao)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carro Reserva:</span>
              <span>{cotacao.carro_reserva_dias} dias</span>
            </div>
            
            {/* Cláusula COTA 01 - Valor Mínimo de Participação */}
            {cotacao.cota_nome && isCota01(cotacao.cota_nome) && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs mt-3">
                <p className="font-semibold text-primary mb-1">📋 COTA 01 – Valor Mínimo de Participação</p>
                <p className="text-muted-foreground">
                  Moto: R$ 1.100,00 | Carro: R$ 1.800,00 | Camionete: R$ 2.500,00
                </p>
                <p className="text-muted-foreground mt-1 italic">
                  Se o valor calculado for inferior, prevalece o valor mínimo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setIsContatoDialogOpen(true)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Registrar Contato
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setIsStatusDialogOpen(true)}
              disabled={!canManage}
            >
              <Edit className="w-4 h-4 mr-2" />
              Alterar Status
            </Button>
            {canApprove && (
              <Button 
                className="w-full"
                onClick={() => setIsApproveDialogOpen(true)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar Cotação
              </Button>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            {cotacao.lead_nome && (
              <p>Lead: {cotacao.lead_nome}</p>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Dados do Cliente e Envio da Proposta */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Cliente
            </CardTitle>
            <CardDescription>
              {cotacao.lead_id ? 'Dados preenchidos a partir do Lead vinculado' : 'Preencha os dados do cliente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clienteNome">Nome do Cliente</Label>
              <Input
                id="clienteNome"
                value={clienteNome}
                onChange={(e) => {
                  setClienteNome(e.target.value);
                  setIsDadosClienteModificados(true);
                }}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clienteEmail">E-mail do Cliente</Label>
              <Input
                id="clienteEmail"
                type="email"
                value={clienteEmail}
                onChange={(e) => {
                  setClienteEmail(e.target.value);
                  setIsDadosClienteModificados(true);
                }}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clienteWhatsapp">WhatsApp</Label>
              <Input
                id="clienteWhatsapp"
                type="tel"
                value={clienteWhatsapp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 11) {
                    const formatted = value
                      .replace(/(\d{2})(\d)/, "($1) $2")
                      .replace(/(\d{5})(\d)/, "$1-$2");
                    setClienteWhatsapp(formatted);
                    setIsDadosClienteModificados(true);
                  }
                }}
                placeholder="(00) 00000-0000"
              />
            </div>
            {isDadosClienteModificados && (
              <Button 
                onClick={handleSaveCliente} 
                disabled={isSavingCliente}
                className="w-full"
              >
                {isSavingCliente ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Salvar Dados do Cliente
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Envio da Proposta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Envio da Proposta
            </CardTitle>
            <CardDescription>
              Gere e compartilhe a proposta com o cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status de envio */}
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              cotacao.proposta_enviada_em 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {cotacao.proposta_enviada_em ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Proposta enviada em {formatDateTime(cotacao.proposta_enviada_em)}</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Proposta ainda não enviada</span>
                </>
              )}
            </div>

            {/* Botões de ação */}
            <div className="space-y-3">
              <Button 
                onClick={handleGerarPdf}
                variant="outline"
                className="w-full justify-start"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Gerar PDF
              </Button>

              <Button 
                onClick={handleEnviarEmail}
                disabled={isSendingEmail || !clienteEmail}
                variant="outline"
                className="w-full justify-start"
              >
                {isSendingEmail ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar por E-mail
                {!clienteEmail && <span className="ml-auto text-xs text-muted-foreground">(informe o e-mail)</span>}
              </Button>

              <Button 
                onClick={handleEnviarWhatsApp}
                disabled={!clienteWhatsapp}
                className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar pelo WhatsApp
                {!clienteWhatsapp && <span className="ml-auto text-xs opacity-80">(informe o WhatsApp)</span>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção Iniciar Vistoria - Apenas para cotações aprovadas */}
      {isAprovado && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Iniciar Vistoria
            </CardTitle>
            <CardDescription>
              A cotação foi aprovada! Escolha como iniciar a vistoria do veículo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link gerado */}
            {vistoriaLink && (
              <div className="p-3 rounded-lg bg-background border text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground font-medium">Link de Vistoria:</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleCopiarLinkVistoria}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <p className="font-mono text-xs break-all text-primary">{vistoriaLink}</p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                onClick={() => handleCriarVistoria('link')}
                disabled={isCreatingVistoria}
                variant="outline"
                className="justify-start"
              >
                {isCreatingVistoria ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Gerar Link de Vistoria
              </Button>

              <Button
                onClick={handleLigarCliente}
                disabled={isCreatingVistoria || !clienteWhatsapp}
                variant="outline"
                className="justify-start"
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar para o Cliente
              </Button>

              <Button
                onClick={() => handleCriarVistoria('whatsapp')}
                disabled={isCreatingVistoria || !clienteWhatsapp}
                className="justify-start bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingVistoria ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 mr-2" />
                )}
                Enviar Link por WhatsApp
              </Button>
            </div>

            {/* Aviso se não tem veículo vinculado */}
            {!cotacao.veiculo_id && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                É necessário vincular um veículo à cotação para iniciar a vistoria.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Contatos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Contatos</CardTitle>
            <Button size="sm" onClick={() => setIsContatoDialogOpen(true)}>
              <Phone className="w-4 h-4 mr-2" />
              Novo Contato
            </Button>
          </div>
          <CardDescription>
            Registro de todas as interações com o cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!cotacao.contatos || cotacao.contatos.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum contato registrado ainda</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setIsContatoDialogOpen(true)}
              >
                Registrar primeiro contato
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {cotacao.contatos.map((contato) => (
                  <div key={contato.id} className="flex gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-full h-fit">
                      {getContatoIcon(contato.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {tipoContatoLabels[contato.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(contato.data_contato)}
                        </span>
                      </div>
                      <p className="text-sm">{contato.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Contato */}
      <Dialog open={isContatoDialogOpen} onOpenChange={setIsContatoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Contato</DialogTitle>
            <DialogDescription>
              Registre uma interação com o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Contato</Label>
              <Select
                value={contatoData.tipo}
                onValueChange={(value) => setContatoData({ ...contatoData, tipo: value as TipoContato })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoContatoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o contato realizado..."
                value={contatoData.descricao}
                onChange={(e) => setContatoData({ ...contatoData, descricao: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContatoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddContato} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Atualize o status da negociação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as CotacaoStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cotacaoStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aprovar */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, uma proposta será gerada automaticamente e o processo de vistoria poderá ser iniciado.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? 'Aprovando...' : 'Aprovar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
