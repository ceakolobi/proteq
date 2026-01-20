import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, Users, Lock, ArrowRight } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import { useEffect } from 'react';

export default function Index() {
  const navigate = useNavigate();
  const { brand, getLogoForContext } = useBrand();

  useEffect(() => {
    document.title = `${brand.name}`;
  }, [brand.name]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={getLogoForContext('auto')} 
              alt={brand.name}
              className="h-12 object-contain"
            />
          </div>
          <Button onClick={() => navigate('/auth')}>
            Acessar Sistema
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-primary">{brand.name}</span>
                <span className="block">Sistema de Gestão</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Plataforma completa para gerenciar associados, veículos, cotações e toda a operação da sua associação de proteção veicular.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Acessar Sistema
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 pt-12">
              <div className="p-6 rounded-xl bg-card border text-left">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Gestão de Veículos</h3>
                <p className="text-muted-foreground text-sm">
                  Controle completo de veículos protegidos com cotação automática por FIPE.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border text-left">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Gestão de Associados</h3>
                <p className="text-muted-foreground text-sm">
                  Cadastro, vistorias, pagamentos e acompanhamento de inadimplência.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border text-left">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Controle de Acesso</h3>
                <p className="text-muted-foreground text-sm">
                  Sistema de permissões por perfil com auditoria completa de ações.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Sistema Privado - Acesso Restrito</p>
        </div>
      </footer>
    </div>
  );
}
