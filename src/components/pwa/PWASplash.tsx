import { useEffect, useState } from 'react';
import { useBrand } from '@/hooks/useBrand';

interface PWASplashProps {
  onComplete: () => void;
}

export function PWASplash({ onComplete }: PWASplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { brand, getLogoForContext } = useBrand();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-24 h-24 bg-primary-foreground/20 rounded-3xl flex items-center justify-center backdrop-blur-sm p-4">
          <img 
            src={getLogoForContext('splash')} 
            alt={brand.name}
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground">{brand.name}</h1>
        <p className="text-primary-foreground/80 text-sm">{brand.subtitle}</p>
      </div>
    </div>
  );
}
