import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStream } from './useChatStream';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <>
      {/* Chat Button - Floating "Fale com a Sofia" */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label={isOpen ? "Fechar chat" : "Abrir chat com Sofia"}
      >
        {/* Pulse animation */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-30" />
        )}
        
        <div className={cn(
          "relative flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300",
          "bg-secondary text-secondary-foreground hover:scale-105 hover:bg-secondary/90",
          isOpen && "px-4"
        )}>
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <Bot className="h-6 w-6" />
              <span className="font-semibold text-sm hidden sm:block">Fale com a Consultora Sofia</span>
            </>
          )}
        </div>
        
        {/* Tooltip on hover */}
        {!isOpen && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
            Atendente Virtual 24h
            <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-foreground text-sm">Sofia - Consultora Virtual</p>
              <p className="text-xs text-primary-foreground/80">Especialista em Proteção Veicular</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary-foreground/60" />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-[320px] p-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">Olá! 👋</p>
                <p className="text-xs text-muted-foreground">
                  Sou a Sofia, sua Consultora Virtual.<br />
                  Especialista em proteção veicular.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {msg.content || (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Digitando...
                      </span>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Digitando...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 h-10 text-sm"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
