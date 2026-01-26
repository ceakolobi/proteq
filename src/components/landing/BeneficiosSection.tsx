import { Card, CardContent } from '@/components/ui/card';
import { Shield, Headphones, MapPin, Percent, Smartphone, Truck } from 'lucide-react';

const beneficios = [
  { 
    icon: Shield, 
    titulo: 'Proteção contra roubo e furto', 
    descricao: 'Cobertura total em caso de perda do veículo' 
  },
  { 
    icon: Headphones, 
    titulo: 'Assistência 24h', 
    descricao: 'Suporte disponível a qualquer hora do dia' 
  },
  { 
    icon: MapPin, 
    titulo: 'Rastreamento veicular', 
    descricao: 'Localização em tempo real do seu veículo' 
  },
  { 
    icon: Percent, 
    titulo: 'Até 100% da FIPE', 
    descricao: 'Indenização integral pelo valor de mercado' 
  },
  { 
    icon: Smartphone, 
    titulo: 'Processo 100% digital', 
    descricao: 'Sem burocracia, tudo pelo celular' 
  },
  { 
    icon: Truck, 
    titulo: 'Guincho 500km', 
    descricao: '250km ida e volta em caso de necessidade' 
  },
];

export function BeneficiosSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Benefícios da proteção veicular
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Com a nossa proteção, você garante tranquilidade, segurança e economia.
            Todo o processo é feito online, com envio automático da proposta.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {beneficios.map((beneficio, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <beneficio.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{beneficio.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{beneficio.descricao}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
