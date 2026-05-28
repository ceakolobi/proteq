import { 
  Shield, 
  Headphones, 
  MapPin, 
  Percent, 
  Truck, 
  Car,
  Key,
  Zap,
  CloudRain
} from 'lucide-react';

const beneficios = [
  { 
    icon: Shield, 
    titulo: 'Proteção Total', 
    descricao: 'Cobertura contra roubo, furto e acidentes',
    destaque: true 
  },
  { 
    icon: Headphones, 
    titulo: 'Assistência 24h', 
    descricao: 'Suporte disponível a qualquer hora' 
  },
  { 
    icon: MapPin, 
    titulo: 'Rastreamento', 
    descricao: 'Localização em tempo real' 
  },
  { 
    icon: Percent, 
    titulo: '100% da FIPE', 
    descricao: 'Indenização integral' 
  },
  { 
    icon: Truck, 
    titulo: 'Guincho', 
    descricao: '250 km' 
  },
  { 
    icon: Car, 
    titulo: 'Carro Reserva', 
    descricao: '30 dias inclusos' 
  },
  { 
    icon: Key, 
    titulo: 'Chaveiro 24h', 
    descricao: 'Atendimento gratuito' 
  },
  { 
    icon: Zap, 
    titulo: 'Pane Elétrica', 
    descricao: 'Assistência inclusa' 
  },
  { 
    icon: CloudRain, 
    titulo: 'Eventos Naturais', 
    descricao: 'Proteção completa' 
  },
];

export function BeneficiosSection() {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Benefícios inclusos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo o que você precisa
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Proteção completa para seu veículo com os melhores benefícios do mercado
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {beneficios.map((beneficio, index) => (
            <div 
              key={index} 
              className={`
                group p-4 md:p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg
                ${beneficio.destaque 
                  ? 'bg-primary text-primary-foreground border-primary col-span-2 md:col-span-1' 
                  : 'bg-card border-border/50 hover:border-primary/30'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-4
                ${beneficio.destaque 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-primary/10 group-hover:bg-primary/20'
                }
              `}>
                <beneficio.icon className={`h-6 w-6 ${beneficio.destaque ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <h3 className="font-bold mb-1">{beneficio.titulo}</h3>
              <p className={`text-sm ${beneficio.destaque ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {beneficio.descricao}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
