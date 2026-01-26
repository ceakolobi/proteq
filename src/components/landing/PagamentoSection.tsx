import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Copy, CheckCircle2, QrCode, CreditCard, Shield, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PagamentoSectionProps {
  chavePix: string | null;
  tipoChavePix: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export function PagamentoSection({ chavePix, tipoChavePix, onBack, onConfirm }: PagamentoSectionProps) {
  const [copiado, setCopiado] = useState(false);

  const copiarChavePix = () => {
    if (chavePix) {
      navigator.clipboard.writeText(chavePix);
      setCopiado(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Pagamento da Adesão</h2>
          <p className="text-muted-foreground">
            Taxa única para ativar sua proteção veicular
          </p>
        </div>

        <Card className="shadow-2xl border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl text-primary">R$ 50,00</CardTitle>
            <CardDescription>Pagamento único • Liberação automática</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Trust badges */}
            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-primary" />
                <span>Seguro</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span>Instantâneo</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                <span>Protegido</span>
              </div>
            </div>

            {/* PIX */}
            {chavePix ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <QrCode className="h-5 w-5 text-primary" />
                  <span>Pague via PIX</span>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Chave PIX ({tipoChavePix || 'CNPJ'})
                  </p>
                  <div className="flex items-center gap-2 bg-background rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono break-all text-center">
                      {chavePix}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={copiarChavePix}
                      className="shrink-0 h-8 w-8"
                    >
                      {copiado ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Após realizar o pagamento, clique em "Confirmar pagamento"
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Chave PIX não configurada.</p>
                <p className="text-xs mt-1">Entre em contato para outras formas de pagamento.</p>
              </div>
            )}

            {/* Informações */}
            <div className="text-xs text-muted-foreground space-y-2 border-t border-border/50 pt-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5" />
                <span>Pagamento único no momento da contratação</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5" />
                <span>Após confirmação, você poderá assinar o contrato</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5" />
                <span>Sua proteção será ativada em até 24h úteis</span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onConfirm} className="flex-1 flex-grow-[2]">
                Confirmar pagamento
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
