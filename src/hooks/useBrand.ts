import { useMemo } from "react";
import { useSettings } from "./useSettings";
import { useAppTheme } from "./useTheme";

// Logos padrão do sistema (Harmony) - 3 versões para cada contexto
import logoHarmonyPrimaria from "@/assets/logo-harmony-colorida.png";
import logoHarmonyBranca from "@/assets/logo-harmony-branca.png";
import logoHarmonyIcone from "@/assets/logo-harmony-icone.png";
import logoHarmonyIconeBranca from "@/assets/logo-harmony-icone-branca.png";

export interface BrandLogos {
  primary: string;    // Logo colorida (login, splash, fundos neutros)
  light: string;      // Logo branca (sidebar escura, header dark)
  dark: string;       // Logo escura/preta (fundos claros, relatórios)
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Brand {
  name: string;
  subtitle: string;
  logos: BrandLogos;
  colors: BrandColors;
  favicon?: string;
  isWhiteLabel: boolean;
}

/**
 * Hook para gerenciar a identidade visual da marca.
 * Suporta troca automática de logo conforme tema e white-label.
 */
export function useBrand() {
  const { settings, isLoading } = useSettings();
  const { resolvedTheme } = useAppTheme();

  const brand = useMemo<Brand>(() => {
    // Se tem white-label configurado, usa as logos da empresa
    const isWhiteLabel = settings.modo_white_label || false;
    
    // Logos configuradas na empresa
    const configuredLogoPrimary = settings.empresa_logo;
    const configuredLogoLight = settings.empresa_logo_branca;
    const configuredLogoDark = settings.empresa_logo_escura;

    // Determina quais logos usar
    let logos: BrandLogos;

    if (isWhiteLabel && configuredLogoPrimary) {
      // White-label: usa logos configuradas
      logos = {
        primary: configuredLogoPrimary,
        light: configuredLogoLight || configuredLogoPrimary,
        dark: configuredLogoDark || configuredLogoPrimary,
      };
    } else {
      // Padrão: usa logos Harmony (3 versões)
      logos = {
        primary: logoHarmonyPrimaria,  // Colorida (laranja)
        light: logoHarmonyBranca,       // Branca (para fundos escuros)
        dark: logoHarmonyPrimaria,      // Colorida (para fundos claros/relatórios)
      };
    }

    // Nome e subtítulo: só usa do banco se for white-label
    const brandName = isWhiteLabel && settings.empresa_nome 
      ? settings.empresa_nome 
      : "Harmony CRM";
    
    const brandSubtitle = "Clube de Benefícios";

    return {
      name: brandName,
      subtitle: brandSubtitle,
      logos,
      colors: {
        primary: settings.cor_primaria || "#F97316",
        secondary: settings.cor_secundaria || "#22C55E",
        accent: settings.cor_destaque || "#F59E0B",
      },
      isWhiteLabel,
    };
  }, [settings]);

  /**
   * Retorna a logo apropriada para o contexto atual
   * @param context - 'sidebar' | 'header' | 'login' | 'splash' | 'report'
   */
  const getLogoForContext = (context: 'sidebar' | 'header' | 'login' | 'splash' | 'report' | 'auto'): string => {
    switch (context) {
      case 'splash':
        // Splash PWA tem fundo colorido (primary) - usa logo branca para contraste
        return brand.logos.light;
      
      case 'login':
        // Login (layout atual) usa fundo neutro/claro no formulário, então prioriza a logo colorida.
        return brand.logos.primary;
      
      case 'report':
        // Relatórios usam logo escura (para imprimir bem em papel branco)
        return brand.logos.dark;
      
      case 'sidebar':
        // Sidebar é SEMPRE dark navy → logo clara (branca) sempre, independente do tema
        return brand.logos.light;
      
      case 'header':
      case 'auto':
      default:
        // Baseado no tema atual
        if (resolvedTheme === 'dark' || resolvedTheme === 'penumbra') {
          return brand.logos.light; // Logo branca para temas escuros
        }
        return brand.logos.dark; // Logo preta para tema claro
    }
  };

  /**
   * Retorna a logo apropriada baseada automaticamente no tema
   */
  const currentLogo = useMemo(() => {
    return getLogoForContext('auto');
  }, [resolvedTheme, brand.logos]);

  return {
    brand,
    isLoading,
    currentLogo,
    getLogoForContext,
    // Expõe logos individuais para casos específicos
    logoPrimary: brand.logos.primary,
    logoLight: brand.logos.light,
    logoDark: brand.logos.dark,
  };
}
