import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Clock, CheckCircle } from 'lucide-react';

interface CTAFinalSectionProps {
  onStart: () => void;
}

export function CTAFinalSection({ onStart }: CTAFinalSectionProps) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-foreground/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-primary-foreground">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-foreground/20 rounded-2xl mb-6">
            <Shield className="h-8 w-8" />
          </div>
          
          {/* Content */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Proteja seu veículo agora mesmo
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Faça sua cotação em menos de 2 minutos e garanta a proteção que seu veículo merece.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <CheckCircle className="h-5 w-5" />
              <span>Sem burocracia</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Clock className="h-5 w-5" />
              <span>Ativação imediata</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Shield className="h-5 w-5" />
              <span>Cobertura total</span>
            </div>
          </div>
          
          {/* CTA Button */}
          <Button 
            size="lg" 
            variant="secondary"
            onClick={onStart}
            className="text-lg px-10 py-7 rounded-xl shadow-2xl hover:shadow-xl hover:scale-105 transition-all group bg-background text-foreground hover:bg-background/90"
          >
            Fazer cotação gratuita
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-sm text-primary-foreground/60 mt-4">
            Sem compromisso • Resultado instantâneo
          </p>
        </div>
      </div>
    </section>
  );
}
