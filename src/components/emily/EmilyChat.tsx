import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
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
};

// Quick reply genérico — pode ter tipo de veículo ou ser ação livre
type QuickReply = {
  label: string;
  value?: string;         // texto que será enviado como mensagem
  tipo?: VehicleType;     // para seleção de tipo no fluxo de cotação
};

type ChatMsg = {
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: QuickReply[];
  cotacao?: CotacaoCard;
  isData?: boolean;       // mensagem com dados reais do sistema
};

// Máquina de estados do fluxo de cotação (apenas contexto public)
type FlowStep =
  | { step: 'idle' }
  | { step: 'aguardando_tipo'; placa: string }
  | { step: 'aguardando_fipe'; placa: string; tipo: VehicleType };

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

// Quick replies iniciais por contexto
const QUICK_REPLIES_BY_CONTEXT: Record<string, QuickReply[]> = {
  public: [
    { label: '💰 Fazer cotação',        value: 'Quero fazer uma cotação' },
    { label: '📋 Como funciona?',       value: 'Como funciona a proteção?' },
    { label: '🚗 Tipos de veículo',     value: 'Quais tipos de veículo vocês protegem?' },
    { label: '📞 Falar com consultor',  value: 'Quero falar com um consultor' },
  ],
  associado: [
    { label: '💳 2ª via / PIX',         value: 'Quero a 2ª via do boleto ou código PIX' },
    { label: '🔍 Status vistoria',      value: 'Qual o status da minha vistoria?' },
    { label: '📄 Meu contrato',         value: 'Quero ver meu contrato e dados de ativação' },
    { label: '📞 Falar com consultor',  value: 'Quero falar com meu consultor' },
  ],
  consultor: [
    { label: '🔍 Buscar associado',     value: 'Quero buscar um associado' },
    { label: '📋 Cotações em aberto',   value: 'Mostre minhas cotações em aberto' },
    { label: '📤 Enviar link vistoria', value: 'Preciso enviar link de vistoria' },
    { label: '📄 Enviar contrato',      value: 'Preciso enviar o contrato para um associado' },
  ],
};

function msgInicial(context: string): ChatMsg {
  const texts: Record<string, string> = {
    public: 'Oi! Sou a Emily, consultora da Harmony 😊\nPosso fazer uma cotação ou tirar suas dúvidas. Como posso te ajudar?',
    associado: 'Olá! Sou a Emily, sua assistente Harmony 😊\nPosso consultar seu pagamento, vistoria, contrato e muito mais. O que precisa?',
    consultor: 'Oi! Sou a Emily, sua assistente interna 😊\nPosso buscar associados, verificar vistorias e te ajudar com o dia a dia.',
  };
  return {
    role: 'assistant',
    content: texts[context] ?? texts.public,
    quickReplies: QUICK_REPLIES_BY_CONTEXT[context],
  };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmilyChat({
  context,
  onStartCotacao,
  associadoId,
  userId,
  consultorId,
  isAdmin = false,
}: EmilyChatProps) {
  const [open, setOpen]     = useState(false);
  const [msgs, setMsgs]     = useState<ChatMsg[]>(() => [msgInicial(context)]);
  const [input, setInput]   = useState('');
  const [loading, setLoad]  = useState(false);
  const [cotas, setCotas]   = useState<Cota[]>([]);
  // Máquina de estados do fluxo de cotação (apenas public)
  const [flow, setFlow]     = useState<FlowStep>({ step: 'idle' });
  // Quick replies iniciais já usados (mostrar só uma vez)
  const [initialUsed, setInitialUsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Carrega cotas (necessário apenas no contexto public para cálculo local)
  useEffect(() => {
    if (context !== 'public') return;
    supabase
      .from('cotas')
      .select('*')
      .eq('ativo', true)
      .order('fipe_min', { ascending: true })
      .then(({ data }) => data && setCotas(data as unknown as Cota[]));
  }, [context]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const push = (m: ChatMsg) => setMsgs((prev) => [...prev, m]);

  // Envia histórico para a edge function e retorna resposta
  const callAI = async (history: ChatMsg[], userText: string): Promise<{ reply: string; action?: string; data?: unknown }> => {
    const payload = [...history, { role: 'user' as const, content: userText }]
      .map(({ role, content }) => ({ role, content }));

    const { data, error } = await supabase.functions.invoke('emily-chat', {
      body: {
        messages: payload,
        context,
        user_id: userId,
        associado_id: associadoId,
        consultor_id: consultorId,
        is_admin: isAdmin,
      },
    });

    if (error) throw error;
    return data as { reply: string; action?: string; data?: unknown };
  };

  // Cálculo local de cotação (contexto public)
  const calcular = (fipe: number, tipo: VehicleType, placa: string): CotacaoCard | null => {
    if (!cotas.length) return null;
    const r = calcularCotacaoCompleta(fipe, tipo, cotas);
    if (!r) return null;
    return { placa, tipo, fipe, mensalidade: r.valorFinal, participacao: r.participacao, cotaNome: r.cotaNome };
  };

  // Clique em quick reply de tipo de veículo (fluxo de cotação)
  const handleTipoVeiculo = (qr: QuickReply) => {
    if (flow.step !== 'aguardando_tipo' || loading || !qr.tipo) return;
    push({ role: 'user', content: qr.label });
    const { placa } = flow;
    setFlow({ step: 'aguardando_fipe', placa, tipo: qr.tipo });
    push({ role: 'assistant', content: `Ótimo! Qual o valor FIPE do veículo? 🚘\n(ex: 45000 ou R$ 45.000)` });
  };

  // Clique em quick reply genérico (ação / texto pré-preenchido)
  const handleQuickReply = (qr: QuickReply) => {
    if (loading) return;
    if (qr.tipo && flow.step === 'aguardando_tipo') {
      handleTipoVeiculo(qr);
      return;
    }
    const text = qr.value ?? qr.label;
    setInitialUsed(true);
    setInput(text);
    // Auto-send
    sendText(text);
  };

  // Lógica principal de envio
  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    push({ role: 'user', content: trimmed });
    setInput('');
    setLoad(true);

    try {
      // ── FLUXO DE COTAÇÃO (apenas public) ─────────────────────────────────

      if (context === 'public') {
        // Passo: aguardando FIPE
        if (flow.step === 'aguardando_fipe') {
          const num = parseFloat(
            trimmed.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
          );
          if (!num || num < 5000) {
            push({ role: 'assistant', content: 'Me passa o valor FIPE do veículo (ex: 45000) 😊' });
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

        // Passo: aguardando tipo via digitação
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

        // Detecta placa na mensagem → inicia fluxo
        const m = trimmed.toUpperCase().match(PLACA_RE);
        if (m) {
          const placa = `${m[1]}${m[2]}${m[3]}${m[4]}`;
          setFlow({ step: 'aguardando_tipo', placa });
          push({
            role: 'assistant',
            content: `Placa ${placa} anotada! Qual é o tipo do veículo? 🚗`,
            quickReplies: TIPO_OPTIONS,
          });
          return;
        }
      }

      // ── CONVERSA LIVRE VIA IA ─────────────────────────────────────────────
      const result = await callAI(msgs, trimmed);
      push({ role: 'assistant', content: result.reply });
    } catch (e) {
      console.error('[EmilyChat]', e);
      push({ role: 'assistant', content: 'Tô com instabilidade. Tenta de novo? 🙏' });
    } finally {
      setLoad(false);
    }
  };

  const send = () => sendText(input);

  // Placeholder dinâmico
  const placeholder =
    flow.step === 'aguardando_fipe' ? 'Valor FIPE (ex: 45000)' :
    flow.step === 'aguardando_tipo' ? 'Ou digite: carro, moto...' :
    context === 'consultor'         ? 'Digite sua pergunta...' :
    context === 'associado'         ? 'Como posso te ajudar?' :
    'Digite a placa ou sua dúvida...';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Botão flutuante ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50"
        aria-label="Falar com Emily"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25" />
        <div className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white pl-1.5 pr-5 py-1.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/30">
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

      {/* ── Janela do chat ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-24 left-6 z-50',
          'w-[calc(100vw-3rem)] sm:w-[26rem] max-w-md',
          'bg-card border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ height: 'min(78vh, 620px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/60 bg-white shrink-0">
            <img src={emilyAvatar} alt="Emily" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Emily • Consultora Virtual</p>
            <p className="text-[11px] text-white/75 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              {context === 'public' ? 'Cotação na hora' :
               context === 'associado' ? 'Assistente do associado' :
               'Assistente interno'}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {msgs.map((m, i) => (
            <div key={i} className={cn('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}>

              {/* Balão de texto */}
              <div
                className={cn(
                  'max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm text-foreground',
                )}
              >
                {m.content}
              </div>

              {/* Quick replies */}
              {m.quickReplies && m.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-w-[95%]">
                  {m.quickReplies.map((qr, j) => {
                    const isVehicleType = !!qr.tipo;
                    const disabled =
                      loading ||
                      (isVehicleType && flow.step !== 'aguardando_tipo');

                    return (
                      <button
                        key={j}
                        onClick={() => handleQuickReply(qr)}
                        disabled={disabled}
                        className={cn(
                          'text-xs px-3 py-1.5 rounded-full border font-medium transition-all active:scale-95 select-none',
                          disabled
                            ? 'border-border text-muted-foreground bg-muted/50 cursor-not-allowed opacity-50'
                            : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer',
                        )}
                      >
                        {qr.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Card de cotação (fluxo public) */}
              {m.cotacao && (
                <div className="max-w-[95%] w-full rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
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
                      <p className="font-semibold text-base text-foreground">{fmt(m.cotacao.participacao)}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    Placa <span className="font-mono font-semibold text-foreground">{m.cotacao.placa}</span>
                    {' · '}FIPE {fmt(m.cotacao.fipe)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mb-3">
                    ✓ 1ª mensalidade grátis · Sem consulta SPC · Proteção imediata
                  </div>
                  <button
                    onClick={() => { setOpen(false); onStartCotacao?.(); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Quero aderir agora →
                  </button>
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(); }}
              placeholder={placeholder}
              disabled={loading}
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors shrink-0"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 leading-tight">
            Emily pode cometer erros. Confirme informações importantes.
          </p>
        </div>
      </div>
    </>
  );
}
