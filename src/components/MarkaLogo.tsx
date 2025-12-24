import markaLogoImg from '@/assets/marka-logo.png';

interface MarkaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

export default function MarkaLogo({ size = 'md', showText = true, className = '' }: MarkaLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={markaLogoImg} 
        alt="MARKA CRM" 
        className={`${sizeClasses[size]} object-contain`}
      />
      {showText && (
        <div>
          <span className="font-bold text-lg leading-tight block">MARKA CRM</span>
          <span className="text-xs text-muted-foreground">Sistema de Gestão</span>
        </div>
      )}
    </div>
  );
}
