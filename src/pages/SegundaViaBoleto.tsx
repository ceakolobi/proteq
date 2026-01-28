import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBrand } from '@/hooks/useBrand';
import { toast } from 'sonner';

export default function SegundaViaBoleto() {
  const navigate = useNavigate();
  const { brand, getLogoForContext } = useBrand();
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      toast.error('Por favor, digite um CPF válido');
      return;
    }

    setLoading(true);

    // Simular busca
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.info('Para acessar seus boletos, faça login na área do associado.');
    setLoading(false);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src={getLogoForContext('auto')}
            alt={brand.name}
            className="h-10 object-contain"
          />
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">2ª Via de Boleto</CardTitle>
              <CardDescription>
                Digite seu CPF para consultar seus boletos em aberto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">CPF do Associado</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="text-center text-lg"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    'Consultando...'
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Consultar Boletos
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-accent/50 border border-accent-foreground/20 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent-foreground">
                      Dica importante
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Para acessar todos os seus boletos e histórico de pagamentos, 
                      recomendamos fazer login na área do associado.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-3">
              Já tem conta?
            </p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Acessar Área do Associado
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
