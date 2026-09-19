import { Shield } from 'lucide-react';
import logoHarmonyBrancaFull from '@/assets/logo-harmony-branca-full.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <img 
              src={logoHarmonyBrancaFull} 
              alt="Proteq"
              className="h-12 object-contain mb-4"
            />
            <p className="text-sm text-secondary-foreground/80 max-w-sm mb-4">
              Proteção veicular 100% digital. Sem burocracia, sem ligações de vendedores, 
              com ativação imediata e os melhores benefícios do mercado.
            </p>
            <div className="flex items-center gap-2 text-sm text-secondary-foreground/80">
              <Shield className="h-4 w-4 text-primary" />
              <span>Empresa regulamentada</span>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-secondary-foreground">Links úteis</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/80">
              <li><a href="#quem-somos" className="hover:text-primary transition-colors">Sobre nós</a></li>
              <li><a href="#servicos" className="hover:text-primary transition-colors">Serviços</a></li>
              <li><a href="#artigos" className="hover:text-primary transition-colors">Artigos</a></li>
              <li><a href="#contato" className="hover:text-primary transition-colors">Contato</a></li>
            </ul>
          </div>
          
        </div>
        
        {/* Bottom */}
        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-secondary-foreground/70">
            © {currentYear} Proteq. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-secondary-foreground/70">
            <a href="#" className="hover:text-primary transition-colors">Termos de uso</a>
            <a href="/privacidade" className="hover:text-primary transition-colors">Política de privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
