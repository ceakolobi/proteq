import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  MessageCircle, 
  Mail, 
  FileText,
  Shield,
  Headphones,
  MapPin,
  Percent,
  Truck,
  Car
} from 'lucide-react';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from './types';

interface ResultadoCotacaoProps {
  dadosPessoais: DadosPessoais;
  dadosVeiculo: DadosVeiculo | null;
  cotacao: ResultadoCotacaoPublica | null;
  onBack: () => void;
  onContinue: () => void;
  onWhatsApp: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ResultadoCotacao({ 
  dadosPessoais, 
  dadosVeiculo, 
  cotacao, 
  onBack, 
  onContinue,
  onWhatsApp 
}: ResultadoCotacaoProps) {
  if (!cotacao || !dadosVeiculo) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8">
            <p className="text-muted-foreground">Não foi possível calcular a cotação. Tente novamente.</p>
            <Button onClick={onBack} className="mt-4">Voltar</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const beneficiosIcons = [
    { icon: Shield, titulo: 'Proteção contra roubo e furto', descricao: 'Cobertura total em caso de perda' },
    { icon: Headphones, titulo: 'Assistência 24h', descricao: 'Suporte a qualquer hora' },
    { icon: MapPin, titulo: 'Rastreamento veicular', descricao: 'Localização em tempo real' },
    { icon: Percent, titulo: 'Até 100% da FIPE', descricao: 'Indenização integral' },
    { icon: Truck, titulo: 'Guincho 500km', descricao: '250km ida e volta' },
    { icon: Car, titulo: '30 dias carro reserva', descricao: 'Mobilidade garantida' },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Sua cotação está pronta!</h2>
          <p className="text-muted-foreground">
            Confira os valores e benefícios da sua proteção veicular
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card principal com valores */}
          <Card className="shadow-xl border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="text-lg">Resumo da Proteção</CardTitle>
              <CardDescription>
                {dadosVeiculo.marca} {dadosVeiculo.modelo} ({dadosVeiculo.ano})
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Valor FIPE</span>
                <span className="font-semibold">{formatCurrency(cotacao.valorFipe)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Cota de Participação</span>
                <span className="font-semibold">{formatCurrency(cotacao.participacao)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-medium">Mensalidade</span>
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(cotacao.mensalidade)}
                </span>
              </div>

              {/* Taxa de adesão */}
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  💳 Taxa de adesão obrigatória: <strong>R$ 50,00</strong>
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Pagamento único no momento da contratação
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Benefícios Inclusos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {beneficiosIcons.map((beneficio, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <beneficio.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{beneficio.titulo}</p>
                      <p className="text-xs text-muted-foreground">{beneficio.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de ação */}
        <Card className="mt-6 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              Como deseja receber sua proposta?
            </p>
            
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2"
                onClick={onWhatsApp}
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <span>WhatsApp</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2"
                onClick={() => {
                  // TODO: Implementar envio por email
                  alert('Em breve: envio por email');
                }}
              >
                <Mail className="h-5 w-5 text-primary" />
                <span>E-mail</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2"
                onClick={() => {
                  // TODO: Implementar download PDF
                  alert('Em breve: download PDF');
                }}
              >
                <FileText className="h-5 w-5 text-primary" />
                <span>Baixar PDF</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onContinue} className="flex-1 flex-grow-[2]">
                Continuar para pagamento
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
