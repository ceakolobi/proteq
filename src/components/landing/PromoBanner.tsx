import { Gift, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromoBannerProps {
  onStart: () => void;
}

export function PromoBanner({ onStart }: PromoBannerProps) {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-secondary" />
      
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,white_2px,transparent_2px)] bg-[length:40px_40px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/30 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Gift className="h-5 w-5 text-secondary" />
              <span className="text-sm font-semibold text-primary-foreground">Oferta por tempo limitado</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              1ª Mensalidade{' '}
              <span className="text-secondary">GRÁTIS!</span>
            </h2>
            
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-6 max-w-xl">
              Cadastre-se até <strong>30 de março</strong> e ganhe sua primeira mensalidade. 
              Proteção completa para seu veículo sem pagar nada no primeiro mês!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button 
                onClick={onStart}
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold px-8 py-6 text-lg shadow-lg"
              >
                Quero minha cotação grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                <Clock className="h-5 w-5 text-secondary" />
                <span className="text-primary-foreground font-medium">
                  Vencimento: <strong>10/03</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right content - Promo card */}
          <div className="flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center">
                <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Gift className="h-10 w-10 text-secondary-foreground" />
                </div>
                
                <p className="text-primary-foreground/80 text-sm mb-2">Você economiza</p>
                <p className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2">
                  R$ <span className="text-secondary">150</span>
                </p>
                <p className="text-primary-foreground/80 text-sm">valor médio da 1ª mensalidade</p>
                
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-xs text-primary-foreground/70">
                    *Válido para cadastros até 30/03/2025
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
