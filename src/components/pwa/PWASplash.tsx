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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-sidebar transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Subtle decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/5" />
      
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo container */}
        <div className="w-28 h-28 rounded-[2rem] bg-card/10 border border-border/20 flex items-center justify-center backdrop-blur-sm p-5 shadow-xl">
          <img 
            src={getLogoForContext('splash')} 
            alt={brand.name}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
        
        {/* App name */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">{brand.name}</h1>
          <p className="text-sidebar-foreground/60 text-xs mt-1">{brand.subtitle}</p>
        </div>

        {/* Loading indicator */}
        <div className="mt-4 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
