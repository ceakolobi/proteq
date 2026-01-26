import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useBrand } from '@/hooks/useBrand';
import { usePublicQuotation } from '@/hooks/usePublicQuotation';
import { 
  HeroSection, 
  ComoFuncionaSection,
  DadosPessoaisForm, 
  DadosVeiculoForm, 
  ResultadoCotacao,
  BeneficiosSection,
  ConfiancaSection,
  CTAFinalSection,
  PagamentoSection,
  LandingFooter,
  CadastroContaForm,
  DocumentosUploadForm
} from '@/components/landing';
import { Button } from '@/components/ui/button';
import { LogIn, CheckCircle2, Shield, PartyPopper, Clock } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { brand } = useBrand();
  const quotation = usePublicQuotation();

  useEffect(() => {
    document.title = `${brand.name} - Proteção Veicular`;
  }, [brand.name]);

  // Renderizar etapa atual do funil
  const renderEtapa = () => {
    switch (quotation.etapa) {
      case 'hero':
        return (
          <>
            <HeroSection onStart={quotation.avancarParaDadosPessoais} />
            <ComoFuncionaSection />
            <BeneficiosSection />
            <ConfiancaSection />
            <CTAFinalSection onStart={quotation.avancarParaDadosPessoais} />
          </>
        );
      
      case 'dados_pessoais':
        return (
          <DadosPessoaisForm
            initialData={quotation.dadosPessoais}
            onSubmit={quotation.salvarDadosPessoais}
            onBack={quotation.voltarEtapa}
          />
        );
      
      case 'dados_veiculo':
        return (
          <DadosVeiculoForm
            onSubmit={quotation.salvarDadosVeiculo}
            onBack={quotation.voltarEtapa}
            loading={quotation.loading}
          />
        );
      
      case 'resultado':
        return (
          <ResultadoCotacao
            dadosPessoais={quotation.dadosPessoais}
            dadosVeiculo={quotation.dadosVeiculo}
            cotacao={quotation.cotacao}
            onBack={quotation.voltarEtapa}
            onContinue={quotation.aceitarProposta}
            onWhatsApp={quotation.enviarPropostaWhatsApp}
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
      
      case 'pagamento':
        return (
          <PagamentoSection
            chavePix={quotation.configFinanceira?.chave_pix || null}
            tipoChavePix={quotation.configFinanceira?.tipo_chave_pix || null}
            onBack={quotation.voltarEtapa}
            onConfirm={quotation.confirmarPagamento}
          />
        );
      
      case 'sucesso':
        return (
          <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background py-16 px-4">
            <div className="text-center max-w-lg">
              {/* Success Icon */}
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                  <PartyPopper className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Parabéns! 🎉
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Seu cadastro foi finalizado com sucesso!
                Sua proteção será ativada após análise dos documentos.
              </p>
              
              {/* Info cards */}
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

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 text-left">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  📋 Importante sobre a carência
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  A proteção contra furto e roubo é <strong>imediata</strong>. 
                  Os demais benefícios entram em vigor após 72 horas da ativação.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} size="lg" className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Acessar minha conta
                </Button>
                <Button variant="outline" onClick={quotation.reiniciar} className="w-full">
                  Nova cotação
                </Button>
              </div>
            </div>
          </section>
        );
      
      default:
        return <HeroSection onStart={quotation.avancarParaDadosPessoais} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fixo com acesso ao sistema */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Acessar Sistema
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 pt-14">
        {renderEtapa()}
      </main>

      {/* Footer apenas na home */}
      {quotation.etapa === 'hero' && <LandingFooter />}
    </div>
  );
}
