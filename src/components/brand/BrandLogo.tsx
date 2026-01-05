import { useBrand } from "@/hooks/useBrand";
import { cn } from "@/lib/utils";

export type LogoContext = 'sidebar' | 'header' | 'login' | 'splash' | 'report' | 'auto';

interface BrandLogoProps {
  context?: LogoContext;
  className?: string;
  showName?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-14',
};

const textSizeClasses = {
  sm: { name: 'text-sm', subtitle: 'text-[9px]' },
  md: { name: 'text-base', subtitle: 'text-[10px]' },
  lg: { name: 'text-lg', subtitle: 'text-xs' },
  xl: { name: 'text-2xl', subtitle: 'text-sm' },
};

/**
 * Componente de logo dinâmico que troca automaticamente baseado no tema e contexto.
 */
export function BrandLogo({
  context = 'auto',
  className,
  showName = false,
  showSubtitle = false,
  size = 'md',
}: BrandLogoProps) {
  const { brand, getLogoForContext, isLoading } = useBrand();
  
  const logoSrc = getLogoForContext(context);
  
  if (isLoading) {
    return (
      <div className={cn("animate-pulse bg-muted rounded", sizeClasses[size], className)} 
           style={{ aspectRatio: '3/1' }} 
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src={logoSrc} 
        alt={brand.name}
        className={cn("object-contain", sizeClasses[size])}
      />
      {(showName || showSubtitle) && (
        <div className="flex flex-col">
          {showName && (
            <span className={cn("font-bold tracking-tight", textSizeClasses[size].name)}>
              {brand.name}
            </span>
          )}
          {showSubtitle && (
            <span className={cn("text-muted-foreground", textSizeClasses[size].subtitle)}>
              {brand.subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Logo para uso na sidebar (adapta ao tema)
 */
export function SidebarLogo({ className }: { className?: string }) {
  return (
    <BrandLogo 
      context="sidebar" 
      size="md" 
      showName 
      showSubtitle 
      className={className}
    />
  );
}

/**
 * Logo para uso na tela de login (sempre colorida)
 */
export function LoginLogo({ className, size = 'lg' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <BrandLogo 
      context="login" 
      size={size} 
      showName 
      showSubtitle 
      className={className}
    />
  );
}

/**
 * Logo para uso no splash do PWA (sempre colorida, grande)
 */
export function SplashLogo({ className }: { className?: string }) {
  return (
    <BrandLogo 
      context="splash" 
      size="xl" 
      showName 
      showSubtitle 
      className={className}
    />
  );
}
