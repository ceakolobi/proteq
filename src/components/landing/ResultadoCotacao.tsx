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
  Car,
  Key,
  Zap,
  Sparkles
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
  if (!dadosVeiculo) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8">
            <p className="text-muted-foreground">Dados do veículo não encontrados. Tente novamente.</p>
            <Button onClick={onBack} className="mt-4">Voltar</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!cotacao) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg">Cotação não disponível</h3>
            <p className="text-muted-foreground text-sm">
              Não encontramos uma faixa de proteção para o veículo informado 
              ({dadosVeiculo.marca} {dadosVeiculo.modelo} - {formatCurrency(dadosVeiculo.valor_fipe || 0)}).
            </p>
            <p className="text-xs text-muted-foreground">
              Por favor, entre em contato conosco para uma cotação personalizada.
            </p>
            <Button onClick={onBack} className="mt-4">Voltar e tentar novamente</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const beneficiosIcons = [
    { icon: Shield, titulo: 'Proteção Total', descricao: 'Roubo e furto' },
    { icon: Headphones, titulo: 'Assistência 24h', descricao: 'Suporte integral' },
    { icon: MapPin, titulo: 'Rastreamento', descricao: 'Tempo real' },
    { icon: Percent, titulo: '100% FIPE', descricao: 'Indenização total' },
    { icon: Truck, titulo: 'Guincho 500km', descricao: '250km ida/volta' },
    { icon: Car, titulo: 'Carro Reserva', descricao: '30 dias inclusos' },
    { icon: Key, titulo: 'Chaveiro 24h', descricao: 'Gratuito' },
    { icon: Zap, titulo: 'Pane Elétrica', descricao: 'Assistência inclusa' },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Sua cotação está pronta!</h2>
          <p className="text-lg text-muted-foreground">
            Olá <span className="font-semibold text-foreground">{dadosPessoais.nome.split(' ')[0]}</span>, 
            confira os valores da sua proteção
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Card principal com valores */}
          <Card className="lg:col-span-2 shadow-2xl border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
              <p className="text-sm opacity-80 mb-1">Veículo</p>
              <p className="font-bold text-lg">
                {dadosVeiculo.marca} {dadosVeiculo.modelo}
              </p>
              <p className="text-sm opacity-80">Ano {dadosVeiculo.ano}</p>
            </div>
            
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Valor FIPE</span>
                <span className="font-semibold">{formatCurrency(cotacao.valorFipe)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Participação</span>
                <span className="font-semibold">{formatCurrency(cotacao.participacao)}</span>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">Mensalidade</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(cotacao.mensalidade)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">por mês</p>
              </div>

              {/* Taxa de adesão */}
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Taxa de Adesão</p>
                    <p className="text-xs text-muted-foreground">Pagamento único</p>
                  </div>
                  <p className="text-xl font-bold text-primary">R$ 50</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios */}
          <Card className="lg:col-span-3 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Benefícios Inclusos
              </CardTitle>
              <CardDescription>
                Tudo o que você precisa para proteger seu veículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {beneficiosIcons.map((beneficio, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                      <beneficio.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{beneficio.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">{beneficio.descricao}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de ação */}
        <Card className="mt-6 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Receba sua proposta detalhada
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={onWhatsApp}
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={() => {
                  alert('Em breve: envio por email');
                }}
              >
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-xs">E-mail</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={() => {
                  alert('Em breve: download PDF');
                }}
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs">Baixar PDF</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onBack} className="px-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onContinue} className="flex-1 py-6 text-lg">
                Continuar para pagamento
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
