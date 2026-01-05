import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface PWASplashProps {
  onComplete: () => void;
}

export function PWASplash({ onComplete }: PWASplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
          <Shield className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Harmony</h1>
        <p className="text-white/80 text-sm">Proteção Veicular</p>
      </div>
    </div>
  );
}
