import { useState } from 'react';
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
  Sparkles,
  Loader2
} from 'lucide-react';
import { StepIndicator } from './StepIndicator';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const QUOTATION_STEPS = [
  { number: 1, label: 'Seus Dados' },
  { number: 2, label: 'Veículo' },
  { number: 3, label: 'Proposta' },
];

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

// Gera HTML para o PDF da cotação pública
const generatePdfHtml = (
  dadosPessoais: DadosPessoais,
  dadosVeiculo: DadosVeiculo,
  cotacao: ResultadoCotacaoPublica
) => {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Proposta de Cotação</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
        .header h1 { color: #f97316; font-size: 28px; margin-bottom: 5px; }
        .header p { color: #666; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 16px; font-weight: bold; color: #f97316; margin-bottom: 12px; padding-bottom: 5px; border-bottom: 1px solid #eee; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { padding: 8px 0; }
        .info-label { font-size: 12px; color: #666; }
        .info-value { font-size: 14px; font-weight: bold; }
        .highlight-box { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
        .highlight-box .amount { font-size: 36px; font-weight: bold; }
        .highlight-box .label { font-size: 14px; opacity: 0.9; }
        .benefits { background: #f9fafb; padding: 20px; border-radius: 10px; }
        .benefit-item { padding: 8px 0; display: flex; align-items: center; }
        .benefit-item::before { content: "✓"; color: #22c55e; font-weight: bold; margin-right: 10px; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
        .validity { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🛡️ Proteção Veicular</h1>
        <p>Proposta de Cotação</p>
      </div>
      
      <div class="section">
        <div class="section-title">👤 Dados do Cliente</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nome</div>
            <div class="info-value">${dadosPessoais.nome}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Telefone</div>
            <div class="info-value">${dadosPessoais.telefone}</div>
          </div>
          <div class="info-item">
            <div class="info-label">E-mail</div>
            <div class="info-value">${dadosPessoais.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data</div>
            <div class="info-value">${dataAtual}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">🚗 Dados do Veículo</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Marca/Modelo</div>
            <div class="info-value">${dadosVeiculo.marca} ${dadosVeiculo.modelo}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Ano</div>
            <div class="info-value">${dadosVeiculo.ano}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Valor FIPE</div>
            <div class="info-value">${formatCurrency(cotacao.valorFipe)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Participação</div>
            <div class="info-value">${formatCurrency(cotacao.participacao)}</div>
          </div>
        </div>
      </div>
      
      <div class="highlight-box">
        <div class="label">Mensalidade</div>
        <div class="amount">${formatCurrency(cotacao.mensalidade)}</div>
        <div class="label">por mês</div>
      </div>
      
      <div class="section">
        <div class="section-title">✅ Benefícios Inclusos</div>
        <div class="benefits">
          <div class="benefit-item">Proteção Total - Roubo e Furto (100% FIPE)</div>
          <div class="benefit-item">Assistência 24h - Suporte Integral</div>
          <div class="benefit-item">Rastreamento - Tempo Real</div>
          <div class="benefit-item">Guincho 500km - 250km ida/volta</div>
          <div class="benefit-item">Carro Reserva - 30 dias inclusos</div>
          <div class="benefit-item">Chaveiro 24h - Gratuito</div>
          <div class="benefit-item">Pane Elétrica/Mecânica - Assistência Inclusa</div>
          <div class="benefit-item">Eventos da Natureza - Proteção Completa</div>
        </div>
      </div>
      
      <div class="validity">
        ⏳ <strong>Validade da proposta:</strong> 7 dias
      </div>
      
      <div class="footer">
        <p>Proposta gerada em ${dataAtual}</p>
        <p>Proteção Veicular - Protegendo o que é seu com transparência e confiança.</p>
      </div>
    </body>
    </html>
  `;
};

export function ResultadoCotacao({ 
  dadosPessoais, 
  dadosVeiculo, 
  cotacao, 
  onBack, 
  onContinue,
  onWhatsApp 
}: ResultadoCotacaoProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Gerar e baixar PDF
  const handleDownloadPdf = async () => {
    if (!dadosVeiculo || !cotacao) return;
    
    setLoadingPdf(true);
    try {
      const htmlContent = generatePdfHtml(dadosPessoais, dadosVeiculo, cotacao);
      
      // Abrir em nova janela para impressão/download
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Auto print
        printWindow.onload = () => {
          printWindow.print();
        };
        toast.success('PDF aberto para download!');
      } else {
        toast.error('Bloqueador de pop-up ativo. Permita pop-ups para baixar o PDF.');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  // Enviar por email
  const handleSendEmail = async () => {
    if (!dadosVeiculo || !cotacao) return;
    
    if (!dadosPessoais.email) {
      toast.error('E-mail não informado');
      return;
    }
    
    setLoadingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-proposta-email', {
        body: {
          to: dadosPessoais.email,
          clienteNome: dadosPessoais.nome,
          modelo: `${dadosVeiculo.marca} ${dadosVeiculo.modelo}`,
          mensalidade: formatCurrency(cotacao.mensalidade),
          validadeDias: 7,
          pdfUrl: null,
          pdfBase64: null, // HTML email já contém as informações
          filename: `Proposta-${dadosVeiculo.marca}-${dadosVeiculo.modelo}.pdf`,
          empresaNome: 'Proteção Veicular'
        }
      });

      if (error) {
        console.error('Erro ao enviar email:', error);
        toast.error('Erro ao enviar e-mail. Tente novamente.');
        return;
      }

      if (data?.success) {
        toast.success(`Proposta enviada para ${dadosPessoais.email}!`);
      } else {
        toast.error(data?.error || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar e-mail');
    } finally {
      setLoadingEmail(false);
    }
  };
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
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Step Indicator */}
        <StepIndicator currentStep={3} steps={QUOTATION_STEPS} />

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

              {/* Sem taxa de adesão */}
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-primary">Adesão gratuita — sem taxa!</p>
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
                onClick={handleSendEmail}
                disabled={loadingEmail}
              >
                {loadingEmail ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs">{loadingEmail ? 'Enviando...' : 'E-mail'}</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleDownloadPdf}
                disabled={loadingPdf}
              >
                {loadingPdf ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs">{loadingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onBack} className="px-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => {
                // Auto-download PDF when accepting
                handleDownloadPdf();
                onContinue();
              }} className="flex-1 py-6 text-lg">
                Aceitar proposta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
