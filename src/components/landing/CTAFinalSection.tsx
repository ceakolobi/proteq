import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTAFinalSectionProps {
  onStart: () => void;
}

export function CTAFinalSection({ onStart }: CTAFinalSectionProps) {
  return (
    <section className="py-20 bg-primary/5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Faça agora sua cotação e proteja seu veículo com segurança
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Processo 100% online, sem burocracia e sem precisar falar com consultor.
          </p>
          <Button 
            size="lg" 
            onClick={onStart}
            className="text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Iniciar cotação
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
