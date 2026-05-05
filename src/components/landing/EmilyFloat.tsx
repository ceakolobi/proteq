import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface EmilyFloatProps {
  onStartCotacao?: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Oi! Eu sou a Emily, sua consultora virtual da Harmony Agro 💬 Como posso te ajudar?',
};

export function EmilyFloat({ onStartCotacao }: EmilyFloatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('emily-chat', {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; error?: string })?.reply
        || (data as { error?: string })?.error
        || 'Desculpe, não consegui responder agora.';
      setMessages([...next, { role: 'assistant', content: reply }]);

      // Direct-to-Plate: detecta placa para sugerir CTA de cotação
      if (/[A-Z]{3}-?\d[A-Z0-9]\d{2}/i.test(text) && onStartCotacao) {
        setTimeout(() => onStartCotacao(), 800);
      }
    } catch (e) {
      console.error('Emily chat error', e);
      setMessages([
        ...next,
        { role: 'assistant', content: 'Estou com instabilidade. Tente novamente em instantes 🙏' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 group"
        aria-label="Falar com Emily"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
        <div className="relative flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40">
          {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          <span className="font-semibold text-sm hidden sm:block">
            {open ? 'Fechar' : 'Falar com Emily'}
          </span>
        </div>
      </button>

      {/* Janela do chat */}
      <div
        className={cn(
          'fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-w-md',
          'bg-card border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{ height: 'min(70vh, 540px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Emily • Consultora Virtual</p>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Online agora
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                )}
              >
                {m.content}
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
              placeholder="Digite sua mensagem..."
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
