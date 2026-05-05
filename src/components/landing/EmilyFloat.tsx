import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { calcularCotacaoCompleta, type Cota } from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';
import emilyAvatar from '@/assets/emily-avatar.png';

type CotacaoCard = {
  placa: string;
  tipo: VehicleType;
  fipe: number;
  mensalidade: number;
  participacao: number;
  cotaNome: string;
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cotacao?: CotacaoCard;
}

interface EmilyFloatProps {
  onStartCotacao?: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Oi! Eu sou a Emily, sua consultora virtual da Harmony Agro 💬\nMe diga a placa do seu veículo que eu já te passo a cotação!',
};

const PLACA_REGEX = /\b([A-Z]{3})-?(\d)([A-Z0-9])(\d{2})\b/i;
type Pendente = { placa: string; tipo: VehicleType } | null;

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function EmilyFloat({ onStartCotacao }: EmilyFloatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [pendente, setPendente] = useState<Pendente>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // carrega cotas uma vez
  useEffect(() => {
    supabase
      .from('cotas')
      .select('*')
      .eq('ativo', true)
      .order('fipe_min', { ascending: true })
      .then(({ data }) => data && setCotas(data as unknown as Cota[]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const push = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const detectarTipo = (placa: string): VehicleType => {
    // heurística simples: deixa o usuário confirmar depois. Default carro.
    return 'carro';
  };

  const calcular = (fipe: number, tipo: VehicleType): CotacaoCard | null => {
    if (!cotas.length) return null;
    const r = calcularCotacaoCompleta(fipe, tipo, cotas);
    if (!r) return null;
    return {
      placa: pendente?.placa ?? '',
      tipo,
      fipe,
      mensalidade: r.valorFinal,
      participacao: r.participacao,
      cotaNome: r.cotaNome,
    };
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    push({ role: 'user', content: text });
    setInput('');
    setLoading(true);

    try {
      // 1) Se já temos placa pendente, esperamos um VALOR FIPE
      if (pendente) {
        const numero = parseFloat(text.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'));
        if (!numero || numero < 1000) {
          push({
            role: 'assistant',
            content: 'Preciso do valor FIPE do veículo (ex: 45000 ou R$ 45.000) 😊',
          });
          return;
        }
        const card = calcular(numero, pendente.tipo);
        if (!card) {
          push({
            role: 'assistant',
            content: 'Não encontrei uma cota para esse valor. Tente outro valor FIPE.',
          });
          return;
        }
        push({
          role: 'assistant',
          content: `Prontinho! Sua cotação para a placa ${pendente.placa} ✨`,
          cotacao: card,
        });
        setPendente(null);
        return;
      }

      // 2) Detecta placa diretamente na mensagem
      const m = text.toUpperCase().match(PLACA_REGEX);
      if (m) {
        const placa = `${m[1]}${m[2]}${m[3]}${m[4]}`;
        const tipo = detectarTipo(placa);
        setPendente({ placa, tipo });
        push({
          role: 'assistant',
          content: `Ótimo! Placa ${placa} registrada 🚗\nAgora me informe o valor FIPE do veículo (ex: 45000) para eu calcular sua mensalidade.`,
        });
        return;
      }

      // 3) Caso contrário, conversa com a IA (regra Direct-to-Plate)
      const history = [...messages, { role: 'user' as const, content: text }];
      const { data, error } = await supabase.functions.invoke('emily-chat', {
        body: { messages: history.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      const reply =
        (data as { reply?: string; error?: string })?.reply ||
        (data as { error?: string })?.error ||
        'Pode me mandar a placa do seu veículo? 🚗';
      push({ role: 'assistant', content: reply });
    } catch (e) {
      console.error('Emily chat error', e);
      push({
        role: 'assistant',
        content: 'Estou com instabilidade. Tente novamente em instantes 🙏',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante azul (estilo anterior) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 group"
        aria-label="Falar com Emily"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
        <div className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white pl-1.5 pr-5 py-1.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40">
          <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/80 bg-white shrink-0">
            <img
              src={emilyAvatar}
              alt="Emily"
              width={512}
              height={512}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-blue-600" />
          </div>
          <span className="font-semibold text-sm hidden sm:block">
            {open ? 'Fechar conversa' : 'Fale com a Consultora Emily'}
          </span>
          {open && <X className="h-5 w-5 sm:hidden" />}
        </div>
      </button>

      {/* Janela do chat */}
      <div
        className={cn(
          'fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] sm:w-[26rem] max-w-md',
          'bg-card border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{ height: 'min(75vh, 600px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/60 bg-white shrink-0">
            <img src={emilyAvatar} alt="Emily" width={512} height={512} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Emily • Consultora Virtual</p>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Faz cotação na hora
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] space-y-2',
                  m.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-card border border-border rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>

                {/* Card de cotação */}
                {m.cotacao && (
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <p className="font-semibold text-sm text-blue-900">{m.cotacao.cotaNome}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Mensalidade</p>
                        <p className="font-bold text-lg text-blue-700">
                          {formatBRL(m.cotacao.mensalidade)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Participação</p>
                        <p className="font-semibold text-sm">{formatBRL(m.cotacao.participacao)}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Placa <span className="font-mono font-semibold">{m.cotacao.placa}</span> · FIPE{' '}
                      {formatBRL(m.cotacao.fipe)}
                    </div>
                    <div className="mt-2 text-[11px] text-emerald-700 font-medium">
                      ✓ 1ª mensalidade grátis · Sem taxa de adesão · Sem consulta SPC
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        onStartCotacao?.();
                      }}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                    >
                      Quero aderir agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-3.5 py-2 rounded-2xl rounded-bl-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-card">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={pendente ? 'Digite o valor FIPE (ex: 45000)' : 'Digite a placa ou sua dúvida...'}
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            IA pode cometer erros. Confirme informações importantes.
          </p>
        </div>
      </div>
    </>
  );
}
