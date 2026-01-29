import { MessageCircle } from 'lucide-react';

interface WhatsAppFloatProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppFloat({ 
  phoneNumber = '5500000000000', 
  message = 'Olá! Vim pelo site e gostaria de mais informações sobre a proteção veicular.' 
}: WhatsAppFloatProps) {
  
  const handleClick = () => {
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    // wa.me é mais confiável que api.whatsapp.com
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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
