import { Shield, Users, Award, Heart } from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Proteção Garantida',
    description: 'Mais de 10 anos protegendo veículos e famílias em todo o Brasil com excelência e dedicação.',
  },
  {
    icon: Users,
    title: 'Comunidade Forte',
    description: 'Milhares de associados unidos pelo mesmo propósito: segurança e tranquilidade no trânsito.',
  },
  {
    icon: Award,
    title: 'Qualidade Premium',
    description: 'Atendimento humanizado e processos 100% digitais para sua comodidade.',
  },
  {
    icon: Heart,
    title: 'Compromisso Real',
    description: 'Cuidamos do seu patrimônio como se fosse nosso, com transparência e honestidade.',
  },
];

export function QuemSomosSection() {
  return (
    <section id="quem-somos" className="py-20 md:py-28 bg-secondary/5 relative overflow-hidden">
      {/* Blue decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-secondary" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-secondary/10 text-secondary text-sm font-semibold rounded-full mb-4 border border-secondary/20">
            Quem Somos
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Sua segurança é nossa <span className="text-secondary">prioridade</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Somos uma associação de proteção veicular comprometida em oferecer 
            tranquilidade e segurança para você e sua família. Com processos 100% 
            digitais, eliminamos a burocracia e entregamos agilidade.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div
              key={index}
              className="group bg-card border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <value.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-secondary/30">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">10+</div>
            <p className="text-sm text-muted-foreground">Anos de Experiência</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">15k+</div>
            <p className="text-sm text-muted-foreground">Veículos Protegidos</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">98%</div>
            <p className="text-sm text-muted-foreground">Satisfação</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">24h</div>
            <p className="text-sm text-muted-foreground">Suporte Disponível</p>
          </div>
        </div>
      </div>
    </section>
  );
}
