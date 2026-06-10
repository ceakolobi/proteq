import { MessageCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

interface WhatsAppFloatProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppFloat({
  phoneNumber,
  message = 'Olá! Vim pelo site e gostaria de mais informações sobre a proteção veicular.'
}: WhatsAppFloatProps) {
  const { settings } = useSettings();

  const handleClick = () => {
    const rawPhone = phoneNumber || settings.telefone || '';
    let digits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits.startsWith('55')) digits = '55' + digits;

    if (!digits || digits === '55') return;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${digits}?text=${encodedMessage}`;

    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      navigator.clipboard?.writeText(whatsappUrl).catch(() => {});
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Contato via WhatsApp"
    >
      {/* Pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
      
      {/* Button */}
      <div className="relative flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/30">
        <MessageCircle className="h-6 w-6 fill-current" />
        <span className="font-semibold text-sm hidden sm:block">Fale Conosco</span>
      </div>
      
      {/* Tooltip on hover (mobile hidden) */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
        Tire suas dúvidas no WhatsApp
        <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
      </div>
    </button>
  );
}
