import { Shield, Heart, Car } from 'lucide-react';
import bannerFamilia from '@/assets/banner-familia-protegida.jpg';

export function FamiliaProtegidaBanner() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={bannerFamilia} 
          alt="Família protegida" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Heart className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary-foreground">Proteção que cuida de você</span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
            Sua família <span className="text-primary">protegida</span>,<br />
            seu veículo <span className="text-primary">seguro</span>.
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed">
            Tranquilidade para você e quem você ama. Com a Harmony, 
            cada viagem é uma aventura sem preocupações.
          </p>

          {/* Features */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-5 py-3">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-primary-foreground font-medium">Cobertura Total</span>
            </div>
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-5 py-3">
              <Car className="h-6 w-6 text-primary" />
              <span className="text-primary-foreground font-medium">Assistência 24h</span>
            </div>
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-5 py-3">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-primary-foreground font-medium">Paz de Espírito</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
