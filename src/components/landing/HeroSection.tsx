import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CheckCircle2, Play } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import heroImage from '@/assets/hero-family-car.png';

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const { brand, getLogoForContext } = useBrand();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Proteção Veicular"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={getLogoForContext('auto')} 
                alt={brand.name}
                className="h-12 md:h-14 object-contain"
              />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">100% Digital • Sem Burocracia</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Proteja seu veículo{' '}
                <span className="text-primary">sem burocracia.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl">
                Cotação online, contratação digital e ativação imediata.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={onStart}
                className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all group"
              >
                Fazer cotação agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 rounded-xl border-2"
              >
                <Play className="mr-2 h-5 w-5" />
                Como funciona
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm">Sem ligações</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm">100% online</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm">Ativação imediata</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border/50">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">10k+</div>
                <div className="text-sm text-muted-foreground">Veículos protegidos</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Satisfação</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">24h</div>
                <div className="text-sm text-muted-foreground">Atendimento</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hidden on mobile, shows on large screens */}
          <div className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
