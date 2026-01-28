import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, Shield, Clock, Zap, Bot } from 'lucide-react';
import pwaMockup from '@/assets/pwa-mockup-floating.png';

interface DigitalNativeSectionProps {
  onStart: () => void;
}

export function DigitalNativeSection({ onStart }: DigitalNativeSectionProps) {
  return (
    <section className="relative py-20 overflow-hidden bg-secondary">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 text-secondary-foreground">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Tecnologia de Ponta</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Já estamos na{' '}
              <span className="text-primary">era da IA!</span>
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-lg">
              Proteção veicular inteligente com tecnologia de ponta. 
              Faça sua cotação em <strong className="text-primary">segundos</strong> e 
              tenha tudo na palma da sua mão.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, text: 'Cotação instantânea' },
                { icon: Shield, text: 'Proteção completa' },
                { icon: Clock, text: 'Assistência 24h' },
                { icon: Smartphone, text: 'Tudo pelo celular' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Phone + CTA Card */}
          <div className="relative flex items-center justify-center lg:justify-end">
            {/* Phone Mockup */}
            <div className="relative">
              <img 
                src={pwaMockup}
                alt="App Harmony Proteção Veicular"
                className="h-[450px] md:h-[550px] object-contain drop-shadow-2xl"
              />
            </div>

            {/* CTA Card */}
            <div className="absolute -right-4 md:right-0 bottom-10 lg:bottom-16 bg-card text-card-foreground rounded-2xl p-6 md:p-8 shadow-2xl max-w-[280px] md:max-w-xs border border-border">
              {/* Icon */}
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                Faça sua cotação agora mesmo!
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6">
                Contrate em <strong className="text-primary">5 minutos</strong> e proteja seu veículo hoje!
              </p>
              
              <Button 
                onClick={onStart}
                size="lg" 
                className="w-full text-base group shadow-lg shadow-primary/30"
              >
                Cotar agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
