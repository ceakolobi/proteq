import { Shield, Lock, Smartphone, UserX, Clock, Award } from 'lucide-react';

const itensConfianca = [
  {
    icon: Lock,
    titulo: 'Sistema seguro',
    descricao: 'Criptografia de ponta a ponta',
  },
  {
    icon: Shield,
    titulo: 'LGPD',
    descricao: 'Dados 100% protegidos',
  },
  {
    icon: Smartphone,
    titulo: '100% Digital',
    descricao: 'Resolva tudo pelo celular',
  },
  {
    icon: UserX,
    titulo: 'Sem ligações',
    descricao: 'Nenhum vendedor',
  },
  {
    icon: Clock,
    titulo: 'Ativação rápida',
    descricao: 'Em até 24 horas',
  },
  {
    icon: Award,
    titulo: 'Garantia',
    descricao: 'Satisfação garantida',
  },
];

export function ConfiancaSection() {
  return (
    <section className="py-16 bg-muted/50 border-y border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h3 className="text-xl md:text-2xl font-bold">Por que escolher a gente?</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {itensConfianca.map((item, index) => (
            <div key={index} className="text-center group">
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-sm mb-1">{item.titulo}</h4>
              <p className="text-xs text-muted-foreground">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
