import { useState } from 'react';
import { X, Gift, Clock } from 'lucide-react';

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-secondary via-secondary to-primary text-secondary-foreground relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      <div className="container mx-auto px-4 py-2.5 relative">
        <div className="flex items-center justify-center gap-3 text-sm md:text-base">
          <Gift className="h-5 w-5 text-primary animate-pulse flex-shrink-0" />
          
          <p className="font-medium text-center">
            <span className="hidden sm:inline">🎉 </span>
            <strong>PROMOÇÃO:</strong> 1ª mensalidade <strong>GRÁTIS</strong> 
            <span className="hidden sm:inline">para cadastros até 30/03</span>
            <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-primary/20 rounded-full font-bold">
              <Clock className="h-3.5 w-3.5" />
              Vence 10/03
            </span>
          </p>
          
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary-foreground/10 rounded-full transition-colors"
            aria-label="Fechar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
