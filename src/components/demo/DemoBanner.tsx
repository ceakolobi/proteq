import { AlertTriangle, Eye } from 'lucide-react';
import { useIsDemo } from '@/hooks/useIsDemo';

export function DemoBanner() {
  const { isDemo } = useIsDemo();

  if (!isDemo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-2.5 px-4 text-center font-medium shadow-lg">
      <div className="flex items-center justify-center gap-3">
        <Eye className="h-4 w-4" />
        <span className="text-sm">
          <strong>Modo Demonstração</strong> — Sistema completo em modo visualização. Dados fictícios para apresentação.
        </span>
        <AlertTriangle className="h-4 w-4 opacity-80" />
      </div>
    </div>
  );
}
