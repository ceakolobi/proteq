import { Car, Truck, Shield, Wrench, Phone, FileCheck, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const services = [
  {
    icon: Car,
    title: 'Proteção Veicular',
    description: 'Cobertura completa para carros, motos e caminhonetes contra roubo, furto e acidentes.',
    features: ['Cobertura Nacional', 'Sem Análise de Perfil', 'Ativação Imediata'],
  },
  {
    icon: Truck,
    title: 'Frota Empresarial',
    description: 'Soluções personalizadas para empresas com frotas de veículos de qualquer porte.',
    features: ['Gestão Centralizada', 'Relatórios Detalhados', 'Preços Especiais'],
  },
  {
    icon: Wrench,
    title: 'Assistência 24h',
    description: 'Guincho, socorro mecânico e chaveiro disponíveis a qualquer hora, em qualquer lugar.',
    features: ['Cobertura Nacional', 'Guincho Ilimitado', 'Atendimento Rápido'],
  },
  {
    icon: Shield,
    title: 'Proteção Patrimonial',
    description: 'Extensão de cobertura para equipamentos e acessórios instalados no veículo.',
    features: ['Som e Multimídia', 'Rodas e Pneus', 'Blindagem'],
  },
];

const benefits = [
  { icon: Zap, text: 'Ativação Imediata' },
  { icon: Clock, text: 'Carência Reduzida' },
  { icon: Phone, text: 'Suporte Humanizado' },
  { icon: FileCheck, text: '100% Digital' },
];

interface ServicosSectionProps {
  onStart?: () => void;
}

export function ServicosSection({ onStart }: ServicosSectionProps) {
  return (
    <section id="servicos" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
            Nossos Serviços
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Proteção completa para o <span className="text-primary">seu veículo</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Oferecemos uma gama completa de serviços para garantir sua tranquilidade 
            no trânsito, com preços justos e atendimento de excelência.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-card border border-border/50 rounded-2xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors duration-300">
                  <service.icon className="h-8 w-8 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1.5 bg-muted rounded-full text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Bar */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {onStart && (
          <div className="text-center mt-12">
            <Button size="lg" onClick={onStart} className="px-8 py-6 text-lg rounded-xl">
              Fazer Cotação Gratuita
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
