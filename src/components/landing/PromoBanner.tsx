import { Gift, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import promoBannerBg from '@/assets/promo-banner-bg.jpg';

interface PromoBannerProps {
  onStart: () => void;
}

export function PromoBanner({ onStart }: PromoBannerProps) {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={promoBannerBg} 
          alt="Família protegida" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-secondary/80" />
      </div>
      
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,white_2px,transparent_2px)] bg-[length:40px_40px]" />
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
            
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-4 max-w-xl">
              Cadastre-se até <strong>28 de fevereiro</strong> e ganhe sua primeira mensalidade. 
              Só pague a partir de <strong>10 de abril</strong>!
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
                  Vencimento: <strong>10/04</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right content - Promo card */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-secondary">
              <div className="text-center">
                <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-4xl">💰</span>
                </div>
                
                <p className="text-muted-foreground text-sm mb-2 uppercase tracking-wide font-semibold">Adesão única</p>
                <p className="text-5xl md:text-6xl font-bold text-primary mb-2">
                  R$ <span className="text-secondary">50</span>
                </p>
                <p className="text-lg text-foreground font-medium">para qualquer veículo</p>
                
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    ✅ Carros, motos, caminhonetes
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
