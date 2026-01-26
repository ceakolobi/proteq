import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useBrand } from '@/hooks/useBrand';
import { usePublicQuotation } from '@/hooks/usePublicQuotation';
import { 
  HeroSection, 
  DadosPessoaisForm, 
  DadosVeiculoForm, 
  ResultadoCotacao,
  BeneficiosSection,
  ConfiancaSection,
  CTAFinalSection,
  PagamentoSection,
  LandingFooter 
} from '@/components/landing';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

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
            onContinue={quotation.avancarParaPagamento}
            onWhatsApp={quotation.enviarPropostaWhatsApp}
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
      
      case 'contrato':
        // TODO: Implementar assinatura de contrato
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Contrato</h2>
              <p className="text-muted-foreground mb-6">
                Em breve: assinatura digital do contrato
              </p>
              <Button onClick={quotation.finalizarCadastro}>
                Simular finalização
              </Button>
            </div>
          </div>
        );
      
      case 'finalizado':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Parabéns!</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Sua proteção veicular foi ativada com sucesso.
                Você receberá uma confirmação por e-mail e WhatsApp.
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Acessar minha conta
                </Button>
                <Button variant="outline" onClick={quotation.reiniciar} className="w-full">
                  Nova cotação
                </Button>
              </div>
            </div>
          </div>
        );
      
      default:
        return <HeroSection onStart={quotation.avancarParaDadosPessoais} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fixo com acesso ao sistema */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
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
