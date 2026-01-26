import { useBrand } from '@/hooks/useBrand';

export function LandingFooter() {
  const { brand } = useBrand();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {brand.name}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Sistema Privado - Acesso Restrito
          </p>
        </div>
      </div>
    </footer>
  );
}
