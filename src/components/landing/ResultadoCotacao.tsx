import { useRef, useState } from 'react';
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
  Sparkles,
  Loader2,
} from 'lucide-react';
import { CATEGORIAS_BENEFICIOS, BENEFICIOS_WHATSAPP } from '@/constants/beneficios';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from './types';
import logoHarmony from '@/assets/logo-harmony-colorida.png';
import { BeneficiosExtrasSelector } from '@/components/cotacao/BeneficiosExtrasSelector';
import { type BeneficioExtra } from '@/hooks/useBeneficiosExtras';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PropostaPDFView } from './PropostaPDFView';


interface ResultadoCotacaoProps {
  dadosPessoais: DadosPessoais;
  dadosVeiculo: DadosVeiculo | null;
  cotacao: ResultadoCotacaoPublica | null;
  onBack: () => void;
  onContinue: () => void;
  onWhatsApp: () => void;
  beneficiosSelecionadosIds?: string[];
  onBeneficiosChange?: (ids: string[], objs: BeneficioExtra[]) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getWhatsAppPhone = (telefone?: string) => {
  let digits = (telefone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.replace(/^00+/, '');
  if (!digits.startsWith('55')) digits = digits.replace(/^0+/, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const openWhatsApp = (telefone: string, mensagem: string) => {
  const text = encodeURIComponent(mensagem);
  const url = telefone ? `https://wa.me/${telefone}?text=${text}` : `https://wa.me/?text=${text}`;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const getWhatsAppUrl = (telefone: string, mensagem: string) => {
  const text = encodeURIComponent(mensagem);
  return `https://wa.me/${telefone}?text=${text}`;
};


const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Tente novamente.';

export function ResultadoCotacao({
  dadosPessoais,
  dadosVeiculo,
  cotacao,
  onBack,
  onContinue,
  onWhatsApp,
  beneficiosSelecionadosIds = [],
  onBeneficiosChange,
}: ResultadoCotacaoProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const pdfViewRef = useRef<HTMLDivElement>(null);
  const [loadingAction, setLoadingAction] = useState<null | 'pdf' | 'email' | 'whatsapp'>(null);
  const [selectedBenefitObjs, setSelectedBenefitObjs] = useState<BeneficioExtra[]>([]);
  const { toast } = useToast();


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


  const filename = `proposta-${(dadosPessoais.nome || 'cliente').split(' ')[0].toLowerCase()}-${Date.now()}.pdf`;

  const gerarPDF = async (): Promise<{ blob: Blob; base64: string } | null> => {
    const element = pdfViewRef.current;
    if (!element) return null;

    const previousStyles = {
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
    };

    // html2canvas pode gerar PDF em branco se o elemento estiver muito fora da tela
    // ou com opacity: 0. Mantemos renderizado e visível apenas durante a captura.
    element.style.left = '0';
    element.style.top = '0';
    element.style.zIndex = '9999';
    element.style.opacity = '1';
    element.style.pointerEvents = 'none';

    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }),
      ),
    );
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      });

      // JPEG com compressão reduz drasticamente o tamanho do PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'mm', 'a4', true);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight - margin * 2;
      }

      const blob = pdf.output('blob');
      const base64 = (pdf.output('datauristring') as string).split(',')[1];
      return { blob, base64 };
    } finally {
      element.style.left = previousStyles.left || '-9999px';
      element.style.top = previousStyles.top;
      element.style.zIndex = previousStyles.zIndex;
      element.style.opacity = previousStyles.opacity;
      element.style.pointerEvents = previousStyles.pointerEvents;

    }
  };

  const handleDownloadPDF = async () => {
    setLoadingAction('pdf');
    try {
      const result = await gerarPDF();
      if (!result) return;
      const url = URL.createObjectURL(result.blob);

      // iOS Safari não suporta o atributo `download` em <a> — o arquivo abre
      // no viewer nativo. Usamos window.open e avisamos o usuário.
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        toast({ title: 'PDF gerado!', description: 'Use o botão Compartilhar do Safari para salvar o arquivo.' });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: getErrorMessage(e) });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmail = async () => {
    if (!dadosPessoais.email) {
      toast({ variant: 'destructive', title: 'E-mail não informado' });
      return;
    }
    setLoadingAction('email');
    try {
      const result = await gerarPDF();
      if (!result) return;
      const { error } = await supabase.functions.invoke('send-proposta-email', {
        body: {
          to: dadosPessoais.email,
          clienteNome: dadosPessoais.nome,
          modelo: `${dadosVeiculo.marca} ${dadosVeiculo.modelo}`,
          mensalidade: formatCurrency(cotacao.mensalidade),
          validadeDias: 7,
          pdfBase64: result.base64,
          filename,
        },
      });
      if (error) throw error;
      toast({ title: 'E-mail enviado!', description: `Proposta enviada para ${dadosPessoais.email}` });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Erro ao enviar e-mail', description: getErrorMessage(e) });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWhatsAppPDF = async () => {
    const telefone = getWhatsAppPhone(dadosPessoais.telefone);
    if (!telefone) {
      toast({
        variant: 'destructive',
        title: 'Telefone não informado',
        description: 'Informe o WhatsApp do cliente antes de enviar a proposta.',
      });
      return;
    }

    setLoadingAction('whatsapp');
    try {
      const nomeCliente = dadosPessoais.nome?.split(' ')[0] || 'cliente';
      const modelo = `${dadosVeiculo.marca} ${dadosVeiculo.modelo}`;

      const extrasSecao = selectedBenefitObjs.length > 0
        ? `\n\n✨ *Benefícios Extras*\n${selectedBenefitObjs.map(b => `- ${b.nome}`).join('\n')}`
        : '';

      const mensagem =
        `🛡️ HARMONY CLUBE DE BENEFÍCIOS\n` +
        `Olá, ${nomeCliente}! 😊\n` +
        `Segue sua proposta de proteção veicular:\n` +
        `🚗 Veículo: ${modelo} ${dadosVeiculo.ano}\n` +
        `💰 Valor FIPE: ${formatCurrency(cotacao.valorFipe)}\n` +
        `💰 Mensalidade: ${formatCurrency(cotacao.mensalidade)}\n` +
        `🛡️ Cota de participação: ${formatCurrency(cotacao.participacao)}\n\n` +
        BENEFICIOS_WHATSAPP +
        extrasSecao +
        `\n\n⏳ Proposta válida por 7 dias.\n` +
        `🤝 Harmony Clube de Benefícios — Proteção Veicular`;

      const url = getWhatsAppUrl(telefone, mensagem);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        navigator.clipboard?.writeText(url).then(() => {
          toast({ title: 'Pop-up bloqueado', description: 'Link do WhatsApp copiado — cole no navegador.' });
        }).catch(() => {
          toast({ title: 'Proposta enviada!', description: 'Abra o WhatsApp manualmente e cole o link.' });
        });
        return;
      }

      toast({ title: 'Proposta enviada!', description: 'Abrindo WhatsApp.' });
    } catch (e: unknown) {
      console.error('[WhatsApp] Erro:', e);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar proposta',
        description: getErrorMessage(e),
      });
    } finally {
      setLoadingAction(null);
    }
  };


  const isLoading = loadingAction !== null;

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-16 px-4">
      {/* Hidden off-screen view used only for PDF capture */}
      <PropostaPDFView
        ref={pdfViewRef}
        dadosPessoais={dadosPessoais}
        dadosVeiculo={dadosVeiculo}
        cotacao={cotacao}
        beneficiosSelecionadosIds={beneficiosSelecionadosIds}
      />

      <div className="container mx-auto max-w-5xl" ref={pdfRef}>
        {/* Header */}
        <div className="text-center mb-10">
          <img src={logoHarmony} alt="Harmony" className="h-14 object-contain mx-auto mb-4" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIAS_BENEFICIOS.map((cat, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs font-semibold mb-1.5 text-foreground">
                      {cat.emoji} {cat.titulo}
                    </p>
                    <ul className="space-y-0.5">
                      {cat.itens.map((item, j) => (
                        <li key={j} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-primary flex-shrink-0 mt-px">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefícios Extras Opcionais */}
        <div className="mt-8">
          <Card className="shadow-xl border-2 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-primary">
                <Sparkles className="h-6 w-6" />
                Deseja adicionar mais benefícios?
              </CardTitle>
              <CardDescription>
                Personalize seu plano adicionando coberturas extras opcionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeneficiosExtrasSelector
                tipoBem={dadosVeiculo.tipo_bem}
                selecionados={beneficiosSelecionadosIds}
                onChange={(ids, objs) => {
                  setSelectedBenefitObjs(objs);
                  (onBeneficiosChange || (() => {}))(ids, objs);
                }}
              />
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
                onClick={handleWhatsAppPDF}
                disabled={isLoading}
              >
                {loadingAction === 'whatsapp' ? (
                  <>
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-xs">Gerando...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="text-xs">WhatsApp</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleEmail}
                disabled={isLoading}
              >
                {loadingAction === 'email' ? (
                  <>
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-xs">Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="text-xs">E-mail</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleDownloadPDF}
                disabled={isLoading}
              >
                {loadingAction === 'pdf' ? (
                  <>
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-xs">Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-xs">Baixar PDF</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onBack} className="px-6" disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onContinue} className="flex-1 py-6 text-lg" disabled={isLoading}>
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
