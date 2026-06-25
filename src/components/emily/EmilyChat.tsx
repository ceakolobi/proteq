import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { calcularCotacaoCompleta, type Cota } from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';
import emilyAvatar from '@/assets/emily-avatar.png';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EmilyChatProps {
  context: 'public' | 'associado' | 'consultor';
  onStartCotacao?: () => void;
  associadoId?: string;
  userId?: string;
  consultorId?: string;
  isAdmin?: boolean;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type CotacaoCard = {
  placa: string;
  tipo: VehicleType;
  fipe: number;
  mensalidade: number;
  participacao: number;
  cotaNome: string;
  cotaId: string;   // necessário para emily-contratar
};

type QuickReply = {
  label: string;
  value?: string;
  tipo?: VehicleType;
};

type ChatMsg = {
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: QuickReply[];
  cotacao?: CotacaoCard;
};

// ─── Fluxo de cotação ─────────────────────────────────────────────────────────

type FlowStep =
  | { step: 'idle' }
  | { step: 'aguardando_tipo'; placa: string }
  | { step: 'aguardando_fipe'; placa: string; tipo: VehicleType };

// ─── Fluxo de contratação ─────────────────────────────────────────────────────

type CampoContrato = 'nome' | 'cpf' | 'nascimento' | 'telefone' | 'email' | 'cidade_estado';

interface DadosContrato {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
}

type ContratoFlow =
  | { step: 'idle' }
  | { step: 'coletando'; campo: CampoContrato; dados: Partial<DadosContrato>; cotacao: CotacaoCard }
  | { step: 'confirmando'; dados: DadosContrato; cotacao: CotacaoCard }
  | { step: 'processando' }
  | { step: 'concluido' };

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLACA_RE = /\b([A-Z]{3})-?(\d)([A-Z0-9])(\d{2})\b/i;

const TIPO_OPTIONS: QuickReply[] = [
  { label: '🚗 Carro',            tipo: 'carro',            value: '🚗 Carro' },
  { label: '🏍️ Moto',             tipo: 'moto',             value: '🏍️ Moto' },
  { label: '🛻 Pickup',           tipo: 'pickup',           value: '🛻 Pickup' },
  { label: '🚛 Caminhão',         tipo: 'caminhao',         value: '🚛 Caminhão' },
  { label: '🚜 Máquina Agrícola', tipo: 'maquina_agricola', value: '🚜 Máquina Agrícola' },
];

const TIPO_ALIASES: Record<string, VehicleType> = {
  carro: 'carro', car: 'carro',
  moto: 'moto', motocicleta: 'moto',
  pickup: 'pickup', caminhonete: 'pickup',
  caminhao: 'caminhao', 'caminhão': 'caminhao',
  maquina: 'maquina_agricola', máquina: 'maquina_agricola',
};

const QUICK_REPLIES_BY_CONTEXT: Record<string, QuickReply[]> = {
  public: [
    { label: '💰 Fazer cotação',       value: 'Quero fazer uma cotação' },
    { label: '📋 Como funciona?',      value: 'Como funciona a proteção?' },
    { label: '🚗 Tipos de veículo',    value: 'Quais tipos de veículo vocês protegem?' },
    { label: '📞 Falar com consultor', value: 'Quero falar com um consultor' },
  ],
  associado: [
    { label: '💳 2ª via / PIX',        value: 'Quero a 2ª via do boleto ou código PIX' },
    { label: '🔍 Status vistoria',     value: 'Qual o status da minha vistoria?' },
    { label: '📄 Meu contrato',        value: 'Quero ver meu contrato e dados de ativação' },
    { label: '📞 Falar com consultor', value: 'Quero falar com meu consultor' },
  ],
  consultor: [
    { label: '🔍 Buscar associado',    value: 'Quero buscar um associado' },
    { label: '📋 Cotações em aberto',  value: 'Mostre minhas cotações em aberto' },
    { label: '📤 Enviar link vistoria',value: 'Preciso enviar link de vistoria' },
    { label: '📄 Enviar contrato',     value: 'Preciso enviar o contrato para um associado' },
  ],
};

// Sequência de campos e perguntas
const CAMPOS_CONTRATO: { campo: CampoContrato; pergunta: string }[] = [
  { campo: 'nome',          pergunta: 'Me diz seu nome completo 😊' },
  { campo: 'cpf',           pergunta: 'Agora o CPF (só números):' },
  { campo: 'nascimento',    pergunta: 'Data de nascimento (dd/mm/aaaa):' },
  { campo: 'telefone',      pergunta: 'WhatsApp com DDD (ex: 47999999999):' },
  { campo: 'email',         pergunta: 'E-mail:' },
  { campo: 'cidade_estado', pergunta: 'Cidade e estado (ex: Joinville/SC):' },
];

// ─── Helpers locais ───────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCPF(c: string): string {
  const d = c.replace(/\D/g, '');
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatPhone(t: string): string {
  const d = t.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  if (rem !== parseInt(nums[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  return rem === parseInt(nums[10]);
}

function validarEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function parseCidadeEstado(input: string): { cidade: string; estado: string } {
  const t = input.trim();
  for (const sep of ['/', ' - ', '-', ',']) {
    if (t.includes(sep)) {
      const [cidade, ...rest] = t.split(sep);
      return { cidade: cidade.trim(), estado: rest.join('').trim().toUpperCase().slice(0, 2) };
    }
  }
  const words = t.split(' ');
  if (words.length >= 2 && words[words.length - 1].length === 2) {
    return {
      cidade: words.slice(0, -1).join(' ').trim(),
      estado: words[words.length - 1].toUpperCase(),
    };
  }
  return { cidade: t, estado: '' };
}

function msgInicial(context: string): ChatMsg {
  const texts: Record<string, string> = {
    public:    'Oi! Sou a Emily, consultora da Harmony 😊\nPosso fazer uma cotação ou tirar suas dúvidas. Como posso te ajudar?',
    associado: 'Olá! Sou a Emily, sua assistente Harmony 😊\nPosso consultar seu pagamento, vistoria, contrato e muito mais. O que precisa?',
    consultor: 'Oi! Sou a Emily, sua assistente interna 😊\nPosso buscar associados, verificar vistorias e te ajudar com o dia a dia.',
  };
  return {
    role: 'assistant',
    content: texts[context] ?? texts.public,
    quickReplies: QUICK_REPLIES_BY_CONTEXT[context],
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmilyChat({
  context,
  onStartCotacao,
  associadoId,
  userId,
  consultorId,
  isAdmin = false,
}: EmilyChatProps) {
  const [open, setOpen]               = useState(false);
  const [msgs, setMsgs]               = useState<ChatMsg[]>(() => [msgInicial(context)]);
  const [input, setInput]             = useState('');
  const [loading, setLoad]            = useState(false);
  const [cotas, setCotas]             = useState<Cota[]>([]);
  const [flow, setFlow]               = useState<FlowStep>({ step: 'idle' });
  const [contratoFlow, setContrato]   = useState<ContratoFlow>({ step: 'idle' });
  const scrollRef                     = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (context !== 'public') return;
    supabase
      .from('cotas').select('*').eq('ativo', true).order('fipe_min', { ascending: true })
      .then(({ data }) => data && setCotas(data as unknown as Cota[]));
  }, [context]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const push = (m: ChatMsg) => setMsgs(prev => [...prev, m]);

  // ── Chamada à IA ──────────────────────────────────────────────────────────
  const callAI = async (history: ChatMsg[], userText: string) => {
    const payload = [...history, { role: 'user' as const, content: userText }]
      .map(({ role, content }) => ({ role, content }));
    const { data, error } = await supabase.functions.invoke('emily-chat', {
      body: { messages: payload, context, user_id: userId, associado_id: associadoId, consultor_id: consultorId, is_admin: isAdmin },
    });
    if (error) throw error;
    return (data as { reply?: string })?.reply ?? 'Pode repetir? 🙏';
  };

  // ── Cálculo local de cotação ───────────────────────────────────────────────
  const calcular = (fipe: number, tipo: VehicleType, placa: string): CotacaoCard | null => {
    if (!cotas.length) return null;
    const r = calcularCotacaoCompleta(fipe, tipo, cotas);
    if (!r) return null;
    return { placa, tipo, fipe, mensalidade: r.valorFinal, participacao: r.participacao, cotaNome: r.cotaNome, cotaId: r.cotaId };
  };

  // ── Inicia coleta de dados para contratação ───────────────────────────────
  const iniciarContrato = (card: CotacaoCard) => {
    setContrato({ step: 'coletando', campo: 'nome', dados: {}, cotacao: card });
    push({ role: 'assistant', content: 'Ótimo! Vou precisar de alguns dados para finalizar. 📋\nMe diz seu nome completo 😊' });
  };

  // ── Finaliza contratação chamando emily-contratar ─────────────────────────
  const finalizarContrato = async (dados: DadosContrato, card: CotacaoCard) => {
    setContrato({ step: 'processando' });
    push({ role: 'assistant', content: 'Estou finalizando sua contratação... ⏳\nAguarde um momento!' });
    setLoad(true);

    try {
      const { data, error } = await supabase.functions.invoke('emily-contratar', {
        body: {
          dadosPessoais: {
            nome_completo: dados.nome_completo,
            cpf: dados.cpf.replace(/\D/g, ''),
            data_nascimento: dados.data_nascimento,
            telefone: dados.telefone.replace(/\D/g, ''),
            email: dados.email.toLowerCase().trim(),
            cidade: dados.cidade,
            estado: dados.estado,
          },
          dadosVeiculo: {
            tipo: card.tipo,
            placa: card.placa,
            valor_fipe: card.fipe,
            cota_id: card.cotaId,
            cota_nome: card.cotaNome,
            mensalidade: card.mensalidade,
            participacao: card.participacao,
          },
        },
      });

      if (error) throw error;
      const result = data as { success: boolean; mensagem: string; cpf_ja_existe?: boolean };

      if (!result.success) {
        if (result.cpf_ja_existe) {
          push({ role: 'assistant', content: `${result.mensagem} 😊` });
        } else {
          push({ role: 'assistant', content: `Ops, tive um probleminha técnico. Nossa equipe já foi notificada! 🙏\n\nOu entre em contato pelo WhatsApp.` });
        }
        setContrato({ step: 'idle' });
        return;
      }

      // Sucesso!
      setContrato({ step: 'concluido' });
      push({
        role: 'assistant',
        content:
          `Tudo pronto, ${dados.nome_completo.split(' ')[0]}! 🎉\n\n` +
          `✅ Sua proteção veicular foi contratada!\n` +
          `📱 Você vai receber no WhatsApp:\n` +
          `   • Acesso à sua área do associado\n` +
          `   • Link para fazer a vistoria do veículo\n\n` +
          `Nossa equipe já foi notificada e em breve entrará em contato!\n\n` +
          `Foi um prazer te atender! 😊`,
      });
    } catch (e) {
      console.error('[EmilyChat] emily-contratar error:', e);
      push({ role: 'assistant', content: 'Ops, tive um probleminha técnico. Nossa equipe já foi notificada! 🙏' });
      setContrato({ step: 'idle' });
    } finally {
      setLoad(false);
    }
  };

  // ── Handler de quick replies ───────────────────────────────────────────────
  const handleQuickReply = (qr: QuickReply) => {
    if (loading) return;
    if (qr.tipo && flow.step === 'aguardando_tipo') {
      push({ role: 'user', content: qr.label });
      const { placa } = flow;
      setFlow({ step: 'aguardando_fipe', placa, tipo: qr.tipo });
      push({ role: 'assistant', content: `Ótimo! Qual o valor FIPE do veículo? 🚘\n(ex: 45000 ou R$ 45.000)` });
      return;
    }
    const text = qr.value ?? qr.label;
    sendText(text);
  };

  // ── Processamento de campo de contrato ────────────────────────────────────
  const processarCampoContrato = (text: string, cf: Extract<ContratoFlow, { step: 'coletando' }>) => {
    const { campo, dados, cotacao } = cf;

    // Validações
    if (campo === 'nome') {
      if (text.trim().length < 5 || !text.trim().includes(' ')) {
        push({ role: 'assistant', content: 'Preciso do nome completo (nome e sobrenome) 😊' });
        return;
      }
      const novosDados = { ...dados, nome_completo: text.trim() };
      const proximo = CAMPOS_CONTRATO[1];
      setContrato({ step: 'coletando', campo: proximo.campo, dados: novosDados, cotacao });
      push({ role: 'assistant', content: proximo.pergunta });
      return;
    }

    if (campo === 'cpf') {
      const cpfLimpo = text.replace(/\D/g, '');
      if (!validarCPF(cpfLimpo)) {
        push({ role: 'assistant', content: 'CPF inválido. Tenta novamente (só os números).' });
        return;
      }
      const novosDados = { ...dados, cpf: cpfLimpo };
      const proximo = CAMPOS_CONTRATO[2];
      setContrato({ step: 'coletando', campo: proximo.campo, dados: novosDados, cotacao });
      push({ role: 'assistant', content: proximo.pergunta });
      return;
    }

    if (campo === 'nascimento') {
      const nums = text.replace(/\D/g, '');
      if (nums.length !== 8) {
        push({ role: 'assistant', content: 'Formato inválido. Use dd/mm/aaaa (ex: 15/03/1990).' });
        return;
      }
      const nascimento = `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
      const novosDados = { ...dados, data_nascimento: nascimento };
      const proximo = CAMPOS_CONTRATO[3];
      setContrato({ step: 'coletando', campo: proximo.campo, dados: novosDados, cotacao });
      push({ role: 'assistant', content: proximo.pergunta });
      return;
    }

    if (campo === 'telefone') {
      const telLimpo = text.replace(/\D/g, '');
      if (telLimpo.length < 10 || telLimpo.length > 11) {
        push({ role: 'assistant', content: 'Informe o WhatsApp com DDD (10 ou 11 dígitos).' });
        return;
      }
      const novosDados = { ...dados, telefone: telLimpo };
      const proximo = CAMPOS_CONTRATO[4];
      setContrato({ step: 'coletando', campo: proximo.campo, dados: novosDados, cotacao });
      push({ role: 'assistant', content: proximo.pergunta });
      return;
    }

    if (campo === 'email') {
      if (!validarEmail(text.trim())) {
        push({ role: 'assistant', content: 'E-mail inválido. Confere e tenta novamente.' });
        return;
      }
      const novosDados = { ...dados, email: text.trim().toLowerCase() };
      const proximo = CAMPOS_CONTRATO[5];
      setContrato({ step: 'coletando', campo: proximo.campo, dados: novosDados, cotacao });
      push({ role: 'assistant', content: proximo.pergunta });
      return;
    }

    if (campo === 'cidade_estado') {
      if (text.trim().length < 3) {
        push({ role: 'assistant', content: 'Informe a cidade e o estado (ex: Joinville/SC).' });
        return;
      }
      const { cidade, estado } = parseCidadeEstado(text);
      const dadosCompletos: DadosContrato = {
        nome_completo: dados.nome_completo!,
        cpf: dados.cpf!,
        data_nascimento: dados.data_nascimento!,
        telefone: dados.telefone!,
        email: dados.email!,
        cidade,
        estado,
      };

      // Mostra confirmação
      setContrato({ step: 'confirmando', dados: dadosCompletos, cotacao });
      push({
        role: 'assistant',
        content:
          `Perfeito! Confirma seus dados antes de finalizar:\n\n` +
          `📋 Nome: ${dadosCompletos.nome_completo}\n` +
          `📄 CPF: ${formatCPF(dadosCompletos.cpf)}\n` +
          `📅 Nascimento: ${dadosCompletos.data_nascimento}\n` +
          `📱 WhatsApp: ${formatPhone(dadosCompletos.telefone)}\n` +
          `📧 Email: ${dadosCompletos.email}\n` +
          `📍 ${dadosCompletos.cidade}/${dadosCompletos.estado}\n\n` +
          `Está tudo correto? (sim / não)`,
      });
    }
  };

  // ── Envio principal ───────────────────────────────────────────────────────
  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    push({ role: 'user', content: trimmed });
    setInput('');
    setLoad(true);

    try {
      // ── Fluxo de contratação ───────────────────────────────────────────────

      if (contratoFlow.step === 'coletando') {
        processarCampoContrato(trimmed, contratoFlow);
        return;
      }

      if (contratoFlow.step === 'confirmando') {
        const lower = trimmed.toLowerCase();
        if (/sim|yes|ok|confirmo|correto|certo|tudo/.test(lower)) {
          await finalizarContrato(contratoFlow.dados, contratoFlow.cotacao);
        } else {
          setContrato({ step: 'idle' });
          push({ role: 'assistant', content: 'Ok! Me diz o que quer corrigir e recomeçamos 😊' });
        }
        return;
      }

      if (contratoFlow.step === 'processando' || contratoFlow.step === 'concluido') {
        return; // ignora input durante processamento/conclusão
      }

      // ── Fluxo de cotação (apenas public) ──────────────────────────────────

      if (context === 'public') {
        if (flow.step === 'aguardando_fipe') {
          const num = parseFloat(trimmed.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'));
          if (!num || num < 5000) {
            push({ role: 'assistant', content: 'Me passa o valor FIPE (ex: 45000) 😊' });
            return;
          }
          const card = calcular(num, flow.tipo, flow.placa);
          if (!card) {
            push({ role: 'assistant', content: 'Não achei faixa de proteção para esse valor. Pode confirmar o FIPE?' });
            return;
          }
          push({ role: 'assistant', content: `Pronto! Aqui está a cotação para a placa ${flow.placa} ✨`, cotacao: card });
          setFlow({ step: 'idle' });
          return;
        }

        if (flow.step === 'aguardando_tipo') {
          const lower = trimmed.toLowerCase();
          const found = Object.entries(TIPO_ALIASES).find(([k]) => lower.includes(k));
          if (found) {
            const { placa } = flow;
            setFlow({ step: 'aguardando_fipe', placa, tipo: found[1] });
            push({ role: 'assistant', content: `Perfeito! Qual o valor FIPE do veículo? 🚘\n(ex: 45000)` });
          } else {
            push({ role: 'assistant', content: 'Escolhe o tipo pelos botões acima 👆' });
          }
          return;
        }

        const m = trimmed.toUpperCase().match(PLACA_RE);
        if (m) {
          const placa = `${m[1]}${m[2]}${m[3]}${m[4]}`;
          setFlow({ step: 'aguardando_tipo', placa });
          push({ role: 'assistant', content: `Placa ${placa} anotada! Qual é o tipo do veículo? 🚗`, quickReplies: TIPO_OPTIONS });
          return;
        }
      }

      // ── Conversa livre via IA ──────────────────────────────────────────────
      const reply = await callAI(msgs, trimmed);
      push({ role: 'assistant', content: reply });
    } catch (e) {
      console.error('[EmilyChat]', e);
      push({ role: 'assistant', content: 'Tô com instabilidade. Tenta de novo? 🙏' });
    } finally {
      setLoad(false);
    }
  };

  const send = () => sendText(input);

  const placeholder =
    contratoFlow.step === 'coletando'    ? CAMPOS_CONTRATO.find(c => c.campo === contratoFlow.campo)?.pergunta.split('\n')[0] ?? 'Digite...' :
    contratoFlow.step === 'confirmando'  ? 'Responda: sim ou não' :
    flow.step === 'aguardando_fipe'      ? 'Valor FIPE (ex: 45000)' :
    flow.step === 'aguardando_tipo'      ? 'Ou digite: carro, moto...' :
    context === 'consultor'              ? 'Digite sua pergunta...' :
    context === 'associado'              ? 'Como posso te ajudar?' :
    'Digite a placa ou sua dúvida...';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Botão flutuante ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 left-6 z-50"
        aria-label="Falar com Emily"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25" />
        <div className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white pl-1.5 pr-5 py-1.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/80 bg-white shrink-0">
            <img src={emilyAvatar} alt="Emily" width={512} height={512} loading="lazy" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-blue-600" />
          </div>
          <span className="font-semibold text-sm hidden sm:block">
            {open ? 'Fechar conversa' : 'Fale com a Emily'}
          </span>
          {open && <X className="h-4 w-4 sm:hidden" />}
        </div>
      </button>

      {/* ── Janela do chat ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-24 left-6 z-50',
          'w-[calc(100vw-3rem)] sm:w-[26rem] max-w-md',
          'bg-card border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ height: 'min(80vh, 640px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/60 bg-white shrink-0">
            <img src={emilyAvatar} alt="Emily" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Emily • Consultora Virtual</p>
            <p className="text-[11px] text-white/75 flex items-center gap-1 mt-0.5">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', contratoFlow.step === 'processando' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse')} />
              {contratoFlow.step === 'processando' ? 'Finalizando contratação...' :
               context === 'public'    ? 'Cotação na hora' :
               context === 'associado' ? 'Assistente do associado' :
               'Assistente interno'}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {msgs.map((m, i) => (
            <div key={i} className={cn('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}>

              {/* Balão */}
              <div className={cn(
                'max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed',
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm',
              )}>
                {m.content}
              </div>

              {/* Quick replies */}
              {m.quickReplies && (
                <div className="flex flex-wrap gap-1.5 max-w-[95%]">
                  {m.quickReplies.map((qr, j) => {
                    const isVehicle  = !!qr.tipo;
                    const disabled   = loading || (isVehicle && flow.step !== 'aguardando_tipo');
                    return (
                      <button
                        key={j}
                        onClick={() => handleQuickReply(qr)}
                        disabled={disabled}
                        className={cn(
                          'text-xs px-3 py-1.5 rounded-full border font-medium transition-all active:scale-95 select-none',
                          disabled
                            ? 'border-border text-muted-foreground bg-muted/50 cursor-not-allowed opacity-50'
                            : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100',
                        )}
                      >
                        {qr.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Card de cotação */}
              {m.cotacao && (
                <div className="max-w-[95%] w-full rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                    <p className="font-semibold text-sm text-blue-900">{m.cotacao.cotaNome}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Mensalidade</p>
                      <p className="font-bold text-xl text-blue-700">{fmt(m.cotacao.mensalidade)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Participação (7%)</p>
                      <p className="font-semibold text-base">{fmt(m.cotacao.participacao)}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Placa <span className="font-mono font-semibold text-foreground">{m.cotacao.placa}</span>
                    {' · '}FIPE {fmt(m.cotacao.fipe)}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mb-3">
                    ✓ 1ª mensalidade grátis · Sem consulta SPC · Proteção imediata
                  </p>

                  {/* Botões de ação */}
                  {contratoFlow.step === 'idle' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => iniciarContrato(m.cotacao!)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Quero contratar
                      </button>
                      <button
                        onClick={() => { setOpen(false); onStartCotacao?.(); }}
                        disabled={loading}
                        className="border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold py-2.5 rounded-lg transition-colors"
                      >
                        Ver formulário
                      </button>
                    </div>
                  )}

                  {(contratoFlow.step !== 'idle') && (
                    <p className="text-[11px] text-blue-600 font-medium text-center">
                      {contratoFlow.step === 'concluido' ? '✅ Contratação concluída!' : '⏳ Contratação em andamento...'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Indicador de digitação */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(); }}
              placeholder={placeholder}
              disabled={loading || contratoFlow.step === 'processando' || contratoFlow.step === 'concluido'}
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim() || contratoFlow.step === 'processando' || contratoFlow.step === 'concluido'}
              aria-label="Enviar"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Emily pode cometer erros. Confirme informações importantes.
          </p>
        </div>
      </div>
    </>
  );
}
