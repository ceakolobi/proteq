import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useBrand } from '@/hooks/useBrand';
import { usePublicQuotation } from '@/hooks/usePublicQuotation';
import { 
  HeroSection, 
  ComoFuncionaSection,
  DigitalNativeSection,
  ResultadoCotacao,
  BeneficiosSection,
  FamiliaProtegidaBanner,
  CTAFinalSection,
  LandingFooter,
  CadastroContaForm,
  DocumentosUploadForm,
  LandingNavbar,
  ServicosSection,
  ArtigosSection,
  ContatoSection,
  AnnouncementBanner,
  WhatsAppFloat,
  PromoBanner,
  CotacaoUnificadaForm
} from '@/components/landing';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { Button } from '@/components/ui/button';
import { LogIn, CheckCircle2, Shield, PartyPopper, Clock } from 'lucide-react';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from '@/components/landing/types';

// Decode shared quotation from URL param
function decodeSharedQuotation(encoded: string): {
  dadosPessoais: DadosPessoais;
  dadosVeiculo: DadosVeiculo;
  cotacao: ResultadoCotacaoPublica;
} | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const p = JSON.parse(json);
    return {
      dadosPessoais: { nome: p.n || '', telefone: p.t || '', email: p.e || '' },
      dadosVeiculo: {
        tipo_bem: p.tb || 'carro',
        marca: p.m || '',
        modelo: p.mo || '',
        ano: p.a || 0,
        valor_fipe: p.vf || 0,
        codigo_fipe: p.cf || '',
      },
      cotacao: {
        mensalidade: p.me || 0,
        participacao: p.pa || 0,
        valorFipe: p.vf || 0,
        cotaNome: p.cn || 'Padrão',
        beneficios: [
          'Proteção contra roubo e furto',
          'Assistência 24h',
          'Rastreamento veicular',
          'Até 100% da FIPE',
          'Guincho 500km',
          '30 dias de carro reserva',
        ],
      },
    };
  } catch (e) {
    console.error('[Index] Erro ao decodificar cotação compartilhada:', e);
    return null;
  }
}

export default function Index() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand } = useBrand();
  const quotation = usePublicQuotation();

  // Detect shared quotation link
  const sharedData = useMemo(() => {
    const cotacaoParam = searchParams.get('cotacao');
    if (cotacaoParam) return decodeSharedQuotation(cotacaoParam);
    return null;
  }, [searchParams]);

  const [showShared, setShowShared] = useState(!!sharedData);

  useEffect(() => {
    if (sharedData) setShowShared(true);
  }, [sharedData]);

  useEffect(() => {
    document.title = `${brand.name} - Proteção Veicular | Cotação Online`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', `${brand.name} - Proteção veicular 100% digital. Faça sua cotação online em 2 minutos, contratação sem burocracia e ativação imediata.`);
    }
  }, [brand.name]);

  // Listener para iniciar cotação via chat
  useEffect(() => {
    const handleStartQuotation = () => {
      quotation.avancarParaCotacao();
    };
    window.addEventListener('start-quotation', handleStartQuotation);
    return () => window.removeEventListener('start-quotation', handleStartQuotation);
  }, [quotation]);

  // Renderizar etapa atual do funil
  const renderEtapa = () => {
    // If viewing a shared quotation link
    if (showShared && sharedData) {
      return (
        <ResultadoCotacao
          dadosPessoais={sharedData.dadosPessoais}
          dadosVeiculo={sharedData.dadosVeiculo}
          cotacao={sharedData.cotacao}
          onBack={() => {
            setShowShared(false);
            setSearchParams({});
          }}
          onContinue={() => {
            setShowShared(false);
            setSearchParams({});
            quotation.avancarParaCotacao();
          }}
          onWhatsApp={() => {}}
        />
      );
    }

    switch (quotation.etapa) {
      case 'hero':
        return (
          <>
            <HeroSection onStart={quotation.avancarParaCotacao} />
            <PromoBanner onStart={quotation.avancarParaCotacao} />
            <ServicosSection onStart={quotation.avancarParaCotacao} />
            <DigitalNativeSection onStart={quotation.avancarParaCotacao} />
            <ComoFuncionaSection />
            <BeneficiosSection />
            <ArtigosSection />
            <FamiliaProtegidaBanner />
            <ContatoSection />
            <CTAFinalSection onStart={quotation.avancarParaCotacao} />
          </>
        );
      
      // Unified form: dados_pessoais, dados_veiculo, resultado all in one
      case 'dados_pessoais':
      case 'dados_veiculo':
      case 'resultado':
        return (
          <CotacaoUnificadaForm
            dadosPessoais={quotation.dadosPessoais}
            setDadosPessoais={quotation.setDadosPessoais}
            cotacao={quotation.cotacao}
            onSubmitAll={quotation.submeterCotacaoUnificada}
            onBack={() => quotation.setEtapa('hero')}
            onAccept={quotation.aceitarProposta}
            onWhatsApp={quotation.enviarPropostaWhatsApp}
            loading={quotation.loading}
          />
        );
      
      case 'cadastro':
        return (
          <CadastroContaForm
            dadosPessoais={quotation.dadosPessoais}
            onSubmit={quotation.criarConta}
            onBack={quotation.voltarEtapa}
            loading={quotation.loading}
          />
        );
      
      case 'documentos':
        return (
          <DocumentosUploadForm
            onSubmit={quotation.salvarDocumentos}
            onBack={quotation.voltarEtapa}
            loading={quotation.loading}
          />
        );
      
      case 'sucesso':
        return (
          <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background py-16 px-4">
            <div className="text-center max-w-lg">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                  <PartyPopper className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Cadastro concluído com sucesso! 🎉
              </h2>
              <p className="text-lg text-muted-foreground mb-2">Sua proteção já está ativa.</p>
              <p className="text-base text-muted-foreground mb-2">Você <strong>não paga taxa de adesão</strong>.</p>
              <p className="text-base text-muted-foreground mb-8">O primeiro pagamento será apenas no próximo vencimento escolhido.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-card border border-border/50 rounded-xl p-4 text-left">
                  <Clock className="h-6 w-6 text-primary mb-2" />
                  <p className="text-sm font-medium">Carência 72h</p>
                  <p className="text-xs text-muted-foreground">Após ativação</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4 text-left">
                  <Shield className="h-6 w-6 text-primary mb-2" />
                  <p className="text-sm font-medium">Proteção Ativa</p>
                  <p className="text-xs text-muted-foreground">Em até 24h úteis</p>
                </div>
              </div>

              <div className="bg-accent/50 border border-accent-foreground/20 rounded-xl p-4 mb-8 text-left">
                <p className="text-sm font-medium text-accent-foreground">📋 Importante sobre a carência</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A proteção contra furto e roubo é <strong>imediata</strong>. 
                  Os demais benefícios entram em vigor após 72 horas da ativação.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} size="lg" className="w-full">
                  <LogIn className="mr-2 h-4 w-4" /> Acessar minha conta
                </Button>
                <Button variant="outline" onClick={quotation.reiniciar} className="w-full">Nova cotação</Button>
              </div>
            </div>
          </section>
        );
      
      default:
        return <HeroSection onStart={quotation.avancarParaCotacao} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {quotation.etapa === 'hero' && !showShared && <LandingNavbar />}
      <main className="flex-1">{renderEtapa()}</main>
      {quotation.etapa === 'hero' && !showShared && <LandingFooter />}
      <ChatWidget />
    </div>
  );
}
