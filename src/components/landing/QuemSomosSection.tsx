import { Shield, Users, Award, Handshake } from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Proteção Completa',
    description: 'Cobertura contra colisão, incêndio, roubo e furto, com assistência 24h em todo território nacional.',
  },
  {
    icon: Users,
    title: 'Cooperativismo',
    description: 'Sistema de colaboração mútua entre associados com os mesmos interesses e objetivos.',
  },
  {
    icon: Award,
    title: 'Custo Acessível',
    description: 'Proteção veicular de qualidade por um valor justo, através do sistema de rateio.',
  },
  {
    icon: Handshake,
    title: 'Confiança',
    description: 'Fundada em 2020, com planejamento desde 2019, construindo uma história sólida.',
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
            Referência em <span className="text-secondary">Proteção Veicular</span> no Brasil
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            A <strong className="text-foreground">Associação Harmony Clube de Benefícios</strong> (CNPJ 39.583.767/0001-26) 
            foi planejada em 2019 e fundada em 2020 com o objetivo de proporcionar a proteção dos veículos 
            de seus associados por um custo mais acessível, através do sistema de cooperativismo.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            O cooperativismo enaltece a colaboração e associação de pessoas com os mesmos interesses, 
            tendo como base a colaboração recíproca de seus associados com a finalidade de prestação 
            de assistência — no nosso caso, proteção veicular — resguardando-os quanto a danos em seus 
            veículos causados por colisão, incêndio, roubo ou furto, além de assistência 24 horas em 
            todo o território nacional. Tudo isso a um excelente custo-benefício.
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
            <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">2020</div>
            <p className="text-sm text-muted-foreground">Ano de Fundação</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">100%</div>
            <p className="text-sm text-muted-foreground">Cobertura Nacional</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">24h</div>
            <p className="text-sm text-muted-foreground">Assistência</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">FIPE</div>
            <p className="text-sm text-muted-foreground">Até 100% da Tabela</p>
          </div>
        </div>
      </div>
    </section>
  );
}
