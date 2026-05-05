import { AlertTriangle } from 'lucide-react';
import { useIsDemo } from '@/hooks/useIsDemo';

export function DemoBanner() {
  const { isDemo } = useIsDemo();

  if (!isDemo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 text-center font-medium shadow-md">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>🔒 Modo Demonstração – Visualização apenas. Alterações não afetam o sistema real.</span>
        <AlertTriangle className="h-4 w-4" />
      </div>
    </div>
  );
}
