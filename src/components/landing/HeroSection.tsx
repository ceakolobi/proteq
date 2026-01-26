import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const { brand, getLogoForContext } = useBrand();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={getLogoForContext('auto')} 
              alt={brand.name}
              className="h-16 md:h-20 object-contain"
            />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Proteja seu veículo de forma{' '}
              <span className="text-primary">simples, rápida</span> e{' '}
              <span className="text-primary">100% digital</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Faça sua cotação agora mesmo e receba sua proposta sem precisar falar com consultor.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={onStart}
              className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Fazer cotação agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Sem burocracia</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>100% online</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Sem ligações de vendedores</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
