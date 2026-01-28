import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, Shield, Clock, Zap } from 'lucide-react';
import pwaMockup from '@/assets/pwa-mockup-hand.png';

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
        {/* Animated gradient line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 text-secondary-foreground">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">100% Digital • Zero Burocracia</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Já nascemos{' '}
              <span className="text-primary">digitais!</span>
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-lg">
              Fazemos parte da nova geração de proteção veicular, 
              oferecendo <strong className="text-primary">mais benefícios</strong> por 
              preços justos — tudo na palma da sua mão.
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
                className="h-[500px] md:h-[600px] object-contain drop-shadow-2xl"
              />
              
              {/* Floating notification badges */}
              <div className="absolute top-20 -left-4 md:-left-8 bg-card text-card-foreground rounded-xl p-3 shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Proteção ativada!</p>
                    <p className="text-[10px] text-muted-foreground">Agora mesmo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="absolute -right-4 md:right-0 top-1/2 -translate-y-1/2 lg:translate-y-0 lg:top-auto lg:bottom-20 bg-card text-card-foreground rounded-2xl p-6 md:p-8 shadow-2xl max-w-[280px] md:max-w-xs border border-border">
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

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            fill="hsl(var(--background))" 
            opacity=".25"
          />
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            fill="hsl(var(--background))" 
            opacity=".5"
          />
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}
