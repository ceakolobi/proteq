import { FileText, Scale, Shield, Clock, Truck, AlertTriangle, Users, UserX, AlertCircle, FileCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const clausulas = [
  {
    id: 'primeira',
    icon: Scale,
    titulo: 'CLÁUSULA PRIMEIRA – DA NATUREZA JURÍDICA',
    conteudo: 'A HARMONY CLUBE DE BENEFÍCIOS, inscrita no CNPJ nº 39.583.767/0001-26, é uma associação civil sem fins lucrativos, constituída nos termos do Código Civil Brasileiro, que atua por meio do sistema de proteção patrimonial mutualista, fundamentado no socorro mútuo e no rateio de despesas entre seus associados.',
  },
  {
    id: 'segunda',
    icon: FileText,
    titulo: 'CLÁUSULA SEGUNDA – DO CADASTRAMENTO JUNTO À SUSEP',
    conteudo: `A HARMONY CLUBE DE BENEFÍCIOS encontra-se devidamente cadastrada junto à Superintendência de Seguros Privados – SUSEP, conforme legislação vigente aplicável às associações de proteção patrimonial mutualista, estando em processo de regularização, nos termos da Lei Complementar nº 213/2025.

O associado declara ciência de que:

I – A Associação não é seguradora;
II – Não comercializa seguros, não emite apólices e não opera sob o regime securitário;
III – Os benefícios decorrem exclusivamente do sistema de socorro mútuo e rateio;
IV – A adesão não caracteriza contrato de seguro;
V – O recebimento de qualquer benefício depende do cumprimento deste regulamento e da regularidade financeira do associado.`,
  },
  {
    id: 'terceira',
    icon: Shield,
    titulo: 'CLÁUSULA TERCEIRA – DO OBJETO',
    conteudo: 'O presente regulamento tem por finalidade estabelecer as regras de funcionamento do Programa de Proteção Veicular, destinado a oferecer suporte mutualista aos associados em caso de eventos previstos neste regulamento, respeitando os princípios do associativismo.',
  },
  {
    id: 'quarta',
    icon: Clock,
    titulo: 'CLÁUSULA QUARTA – DO INÍCIO DA PROTEÇÃO',
    conteudo: `A proteção inicia-se:

a) Após a realização da vistoria;
b) Após a aprovação cadastral;
c) Após o pagamento da taxa inicial;
d) Após o prazo mínimo de 72 (setenta e duas) horas.`,
  },
  {
    id: 'quinta',
    icon: Truck,
    titulo: 'CLÁUSULA QUINTA – DO GUINCHO E ASSISTÊNCIA',
    conteudo: `O serviço de guincho e assistência somente estará disponível após o prazo de 72 horas da ativação.

O associado inadimplente perde automaticamente o direito a qualquer assistência, incluindo:
• Guincho
• Reboque
• Socorro mecânico
• Chaveiro
• Qualquer outro benefício

Não haverá reembolso de serviços utilizados durante período de inadimplência.`,
  },
  {
    id: 'sexta',
    icon: AlertTriangle,
    titulo: 'CLÁUSULA SEXTA – DA INADIMPLÊNCIA',
    conteudo: `O atraso no pagamento suspende automaticamente todos os benefícios.

A reativação dependerá:
• Da quitação integral do débito;
• Nova vistoria, se exigida;
• Novo prazo de carência.`,
  },
  {
    id: 'setima',
    icon: Users,
    titulo: 'CLÁUSULA SÉTIMA – DO RATEIO',
    conteudo: 'O rateio será realizado entre os associados ativos, conforme critérios técnicos definidos pela Diretoria, respeitando o equilíbrio financeiro da associação.',
  },
  {
    id: 'oitava',
    icon: UserX,
    titulo: 'CLÁUSULA OITAVA – DA EXCLUSÃO',
    conteudo: `O associado poderá ser excluído em caso de:
• Inadimplência;
• Fraude;
• Omissão de informações;
• Descumprimento do regulamento.`,
  },
  {
    id: 'nona',
    icon: AlertCircle,
    titulo: 'CLÁUSULA NONA – DA RESPONSABILIDADE',
    conteudo: `A associação não se responsabiliza por:
• Atos dolosos;
• Mau uso do veículo;
• Eventos não previstos neste regulamento;
• Prejuízos decorrentes de informações falsas.`,
  },
  {
    id: 'decima',
    icon: FileCheck,
    titulo: 'CLÁUSULA DÉCIMA – DISPOSIÇÕES FINAIS',
    conteudo: `O presente regulamento poderá ser alterado pela Diretoria Executiva, com comunicação aos associados.

Fica eleito o foro da comarca da sede da Associação para dirimir quaisquer controvérsias.`,
  },
];

export function RegulamentoSection() {
  return (
    <section id="regulamento" className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4 border border-primary/20">
            Regulamento
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Regulamento <span className="text-primary">Interno</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Conheça as regras e diretrizes que regem o funcionamento do nosso Programa de Proteção Veicular.
            Transparência e clareza são nossos princípios fundamentais.
          </p>
        </div>

        {/* Accordion with clauses */}
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {clausulas.map((clausula) => (
              <AccordionItem
                key={clausula.id}
                value={clausula.id}
                className="bg-card border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-lg transition-all duration-300"
              >
                <AccordionTrigger className="hover:no-underline py-5">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <clausula.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-sm md:text-base">{clausula.titulo}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2">
                  <div className="pl-14 pr-4">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
                      {clausula.conteudo}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Legal note */}
        <div className="max-w-4xl mx-auto mt-10 p-6 bg-secondary/5 border border-secondary/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scale className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Nota Legal</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este regulamento está em conformidade com a Lei Complementar nº 213/2025 e demais legislações 
                aplicáveis às associações de proteção patrimonial mutualista. A HARMONY CLUBE DE BENEFÍCIOS 
                prima pela transparência e pelo cumprimento de todas as normas regulatórias vigentes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
