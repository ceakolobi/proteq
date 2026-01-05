import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useState } from 'react';

export function PWAInstallPrompt() {
  const { isPWAReady, promptInstall, isStandalone } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // Não mostrar se já está instalado ou foi dispensado
  if (isStandalone || dismissed || !isPWAReady) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      setDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalar Harmony</p>
          <p className="text-xs text-muted-foreground">Acesso rápido na tela inicial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleInstall}>
            Instalar
          </Button>
        </div>
      </div>
    </div>
  );
}
