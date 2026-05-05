import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const INITIAL_MESSAGE: Msg = {
  role: 'assistant',
  content: 'Oi! Eu sou a Emily 👋 Posso te ajudar com a cotação. Qual a placa do seu veículo?',
};

export function EmilyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-emily', {
        body: { messages: next },
      });
      if (error) throw error;
      const reply = (data as any)?.reply ?? 'Tive um probleminha agora, pode tentar de novo?';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, tive uma falha. Tenta de novo em instantes 🙏' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir chat com Emily"
          className="fixed bottom-6 right-24 sm:right-28 z-50 group"
        >
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
          <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-semibold hidden sm:block">Falar com Emily</span>
          </div>
        </button>
      )}

      {/* Janela do chat */}
      {open && (
        <div
          className={cn(
            'fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden',
            'bottom-6 right-6 left-6 sm:left-auto sm:right-6 sm:w-96 h-[70vh] max-h-[560px]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  Emily <Sparkles className="h-3 w-3" />
                </div>
                <div className="text-[11px] opacity-90">Consultora virtual</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-primary-foreground/15 transition-colors"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border p-3 bg-card flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-muted/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
