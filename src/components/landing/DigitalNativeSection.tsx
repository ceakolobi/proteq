import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, Shield, Clock, Zap, Bot } from 'lucide-react';
import sectionBg from '@/assets/digital-section-bg.jpg';

interface DigitalNativeSectionProps {
  onStart: () => void;
}

export function DigitalNativeSection({ onStart }: DigitalNativeSectionProps) {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={sectionBg}
          alt=""
          className="w-full h-full object-cover object-right"
        />
        {/* Gradient overlay for text readability on left */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/95 to-transparent lg:to-secondary/20" />
      </div>

      <div className="container mx-auto px-4 relative z-10 py-20">
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
                <div key={item.text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button - Mobile */}
            <div className="lg:hidden">
              <Button 
                onClick={onStart}
                size="lg" 
                className="text-base group shadow-lg shadow-primary/30"
              >
                Cotar agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Right Content - CTA Card (desktop only, positioned over phone) */}
          <div className="hidden lg:flex justify-end items-center">
            <div className="bg-card text-card-foreground rounded-2xl p-8 shadow-2xl max-w-xs border border-border">
              {/* Icon */}
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">
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
