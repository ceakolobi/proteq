import { useMemo } from "react";
import { useSettings } from "./useSettings";
import { useAppTheme } from "./useTheme";

// Logos padrão do sistema (MARKA)
import logoMarkaPrimaria from "@/assets/logo-marka-colorida.png";
import logoMarkaBranca from "@/assets/logo-marka-branca.png";

// Logos Harmony (fallback para compatibilidade)
import logoHarmonyPrimaria from "@/assets/logo-harmony-colorida.png";
import logoHarmonyBranca from "@/assets/logo-harmony-branca.png";

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
      // Padrão: usa logos MARKA
      logos = {
        primary: logoMarkaPrimaria,
        light: logoMarkaBranca,
        dark: logoMarkaPrimaria, // Logo colorida funciona em fundo claro também
      };
    }

    return {
      name: settings.empresa_nome || "MARKA CRM",
      subtitle: "Sistema de Gestão",
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
      case 'login':
        // Sempre usa logo primária/colorida
        return brand.logos.primary;
      
      case 'report':
        // Relatórios usam logo escura (para imprimir bem)
        return brand.logos.dark;
      
      case 'sidebar':
      case 'header':
      case 'auto':
      default:
        // Baseado no tema atual
        if (resolvedTheme === 'dark' || resolvedTheme === 'penumbra') {
          return brand.logos.light; // Logo branca para temas escuros
        }
        return brand.logos.dark; // Logo escura para tema claro
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
