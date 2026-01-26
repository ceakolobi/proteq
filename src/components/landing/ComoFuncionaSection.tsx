import { ClipboardList, Calculator, CreditCard, CheckCircle } from 'lucide-react';

const etapas = [
  {
    numero: 1,
    icon: ClipboardList,
    titulo: 'Preencha seus dados',
    descricao: 'Informe seus dados básicos e do veículo em menos de 2 minutos',
  },
  {
    numero: 2,
    icon: Calculator,
    titulo: 'Veja o valor da proteção',
    descricao: 'Receba sua cotação instantânea baseada na tabela FIPE',
  },
  {
    numero: 3,
    icon: CreditCard,
    titulo: 'Pague a adesão',
    descricao: 'Taxa única de R$ 50,00 via Pix com liberação automática',
  },
  {
    numero: 4,
    icon: CheckCircle,
    titulo: 'Assine e ative',
    descricao: 'Assinatura digital do contrato e ativação imediata',
  },
];

export function ComoFuncionaSection() {
  return (
    <section className="py-20 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Processo simples
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Como funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Em apenas 4 passos você protege seu veículo, tudo 100% online
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {etapas.map((etapa, index) => (
            <div key={index} className="relative group">
              {/* Connector line */}
              {index < etapas.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              
              <div className="bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 relative z-10">
                {/* Number badge */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                  {etapa.numero}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <etapa.icon className="h-7 w-7 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-lg mb-2">{etapa.titulo}</h3>
                <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
