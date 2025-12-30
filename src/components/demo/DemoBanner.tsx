import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DemoBannerProps {
  onClose?: () => void;
  closable?: boolean;
}

export function DemoBanner({ onClose, closable = false }: DemoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 shadow-md">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          Você está utilizando o <strong>Ambiente de Demonstração</strong>. Algumas funções estão limitadas.
        </span>
        {closable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-amber-600 text-amber-950"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
