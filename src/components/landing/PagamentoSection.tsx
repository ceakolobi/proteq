import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Copy, CheckCircle2, QrCode, CreditCard } from 'lucide-react';
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
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Taxa de Adesão</CardTitle>
          <CardDescription>Valor único de R$ 50,00 para ativar sua proteção</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Valor */}
          <div className="text-center py-6 bg-primary/5 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
            <p className="text-4xl font-bold text-primary">R$ 50,00</p>
          </div>

          {/* PIX */}
          {chavePix ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-4 w-4" />
                <span>Pagar via PIX</span>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Chave PIX ({tipoChavePix || 'CNPJ'})
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono break-all">
                    {chavePix}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={copiarChavePix}
                    className="shrink-0"
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
                Após realizar o pagamento, clique em "Confirmar pagamento" abaixo
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Chave PIX não configurada.</p>
              <p className="text-xs mt-1">Entre em contato para outras formas de pagamento.</p>
            </div>
          )}

          {/* Informações */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
            <p>• Pagamento único no momento da contratação</p>
            <p>• Após confirmação, você poderá assinar o contrato</p>
            <p>• Sua proteção será ativada em até 24h úteis</p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={onConfirm} className="flex-1">
              Confirmar pagamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
