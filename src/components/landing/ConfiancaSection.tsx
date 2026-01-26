import { Shield, Lock, Smartphone, UserX } from 'lucide-react';

const itensConfianca = [
  {
    icon: Lock,
    titulo: 'Sistema seguro',
    descricao: 'Seus dados protegidos com criptografia',
  },
  {
    icon: Shield,
    titulo: 'Dados protegidos',
    descricao: 'Conformidade com LGPD',
  },
  {
    icon: Smartphone,
    titulo: 'Atendimento digital',
    descricao: 'Resolva tudo pelo celular',
  },
  {
    icon: UserX,
    titulo: 'Sem ligações',
    descricao: 'Nenhum vendedor vai te ligar',
  },
];

export function ConfiancaSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {itensConfianca.map((item, index) => (
            <div key={index} className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{item.titulo}</h3>
              <p className="text-xs text-muted-foreground">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
