import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStream } from './useChatStream';
import { ChatMediaMessage, parseMediaFromContent, QuotationCTAButton, CertidaoSUSEPButton } from './ChatMediaMessage';
import { cn } from '@/lib/utils';
import emilyAvatar from '@/assets/sofia-avatar.png'; // Reusing avatar for Emily
import ReactMarkdown from 'react-markdown';

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
      {/* Chat Button - Floating "Fale com a Emily" */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label={isOpen ? "Fechar chat" : "Abrir chat com Emily"}
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
              <img src={emilyAvatar} alt="Emily" className="h-8 w-8 rounded-full object-cover" />
              <span className="font-semibold text-sm hidden sm:block">Fale com a Consultora Emily</span>
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
              <img src={emilyAvatar} alt="Emily" className="w-10 h-10 rounded-full object-cover border-2 border-primary-foreground/30" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-foreground text-sm">Emily - Consultora Virtual</p>
              <p className="text-xs text-primary-foreground/80">Especialista em Proteção Veicular</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary-foreground/60" />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-[320px] p-4">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <img src={emilyAvatar} alt="Emily" className="w-14 h-14 mx-auto mb-3 rounded-full object-cover border-2 border-primary/30" />
                <p className="text-sm font-medium mb-1">Olá! 👋</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Sou a Emily, sua Consultora Virtual.<br />
                  Como posso ajudar?
                </p>
                
                {/* Quick topic buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { label: '📋 Nova Cotação', msg: 'Quero fazer uma cotação para meu veículo' },
                    { label: '✅ Contratar Proteção', msg: 'Quero contratar a proteção veicular' },
                    { label: '🔄 Renovação', msg: 'Quero renovar minha proteção' },
                    { label: '❓ Tirar Dúvidas', msg: 'Tenho dúvidas sobre a proteção veicular' },
                  ].map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => sendMessage(topic.msg)}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-secondary/80 text-secondary-foreground hover:bg-secondary transition-colors"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, i) => {
                // Parse media from content
                const parsed = msg.role === 'assistant' && msg.content 
                  ? parseMediaFromContent(msg.content)
                  : { text: msg.content, media: [], hasQuotationLink: false, hasCertidaoLink: false };
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                  {msg.role === 'assistant' && (
                      <img src={emilyAvatar} alt="Emily" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1" />
                    )}
                    <div className="max-w-[80%] space-y-2">
                      {/* Text content */}
                      {(parsed.text || !msg.content) && (
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-sm",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          {parsed.text ? (
                            msg.role === 'assistant' ? (
                              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ul]:pl-4 [&>ul>li]:my-0.5 [&_strong]:text-primary [&_strong]:font-semibold">
                                <ReactMarkdown>{parsed.text}</ReactMarkdown>
                              </div>
                            ) : (
                              parsed.text
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Digitando...
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Media content */}
                      {parsed.media.length > 0 && (
                        <div className="space-y-2">
                          {parsed.media.map((mediaItem, idx) => (
                            <ChatMediaMessage key={idx} media={mediaItem} />
                          ))}
                        </div>
                      )}
                      
                      {/* Quotation CTA button */}
                      {parsed.hasQuotationLink && (
                        <QuotationCTAButton className="mt-2" />
                      )}
                      
                      {/* Certidão SUSEP button */}
                      {parsed.hasCertidaoLink && (
                        <CertidaoSUSEPButton className="mt-2" />
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 justify-start">
                  <img src={emilyAvatar} alt="Emily" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
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
