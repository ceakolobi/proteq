import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CheckCircle2, Play, Star } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import heroImage from '@/assets/hero-family-car.png';

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const { brand, getLogoForContext } = useBrand();

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Família protegida com seu veículo"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-40 left-10 w-96 h-96 bg-secondary/20 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2.5 animate-fade-in">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">100% Digital • Sem Burocracia</span>
            </div>

            {/* Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
                Proteja seu veículo{' '}
                <span className="text-primary relative">
                  sem burocracia
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 10C50 4 150 2 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/30"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
                Cotação online em <strong className="text-foreground">2 minutos</strong>, contratação digital e ativação imediata.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={onStart}
                className="text-lg px-8 py-7 rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 group"
              >
                Fazer cotação agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-7 rounded-xl border-2 hover:bg-primary/5"
              >
                <Play className="mr-2 h-5 w-5" />
                Como funciona
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-4">
              {['Sem ligações', '100% online', 'Ativação imediata'].map((text) => (
                <div key={text} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 pt-6 border-t border-border/50">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-semibold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                  <span className="ml-2 text-sm font-semibold">4.9</span>
                </div>
                <p className="text-xs text-muted-foreground">+10.000 associados satisfeitos</p>
              </div>
            </div>
          </div>

          {/* Right Content - Stats Cards (visible on large screens) */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-secondary text-secondary-foreground rounded-2xl p-6 shadow-xl border-2 border-secondary">
              <div className="text-4xl font-bold text-primary mb-2">R$ 89,90</div>
              <p className="text-secondary-foreground/80">A partir de / mês</p>
              <p className="text-sm text-secondary-foreground/70 mt-2">Proteção completa para seu veículo</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border-2 border-secondary/30 rounded-2xl p-5 shadow-lg">
              <div className="text-2xl font-bold text-secondary mb-1">15k+</div>
              <p className="text-sm text-muted-foreground">Veículos protegidos</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border-2 border-primary/30 rounded-2xl p-5 shadow-lg">
              <div className="text-2xl font-bold text-primary mb-1">24h</div>
              <p className="text-sm text-muted-foreground">Assistência disponível</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
