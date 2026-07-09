import { useMemo, useEffect } from "react";
import { useSettings } from "./useSettings";
import { useAppTheme } from "./useTheme";

// ── Utilitários de cor (WCAG) ────────────────────────────────────────────────

export function hexToHSL(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexLuminance(hex: string): number {
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Retorna '0 0% 100%' (branco) ou '220 20% 10%' (quase-preto) com melhor contraste WCAG */
export function bestForegroundHSL(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '0 0% 100%';
  const L = hexLuminance(hex);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  return onWhite >= onBlack ? '0 0% 100%' : '220 20% 10%';
}

/** Contraste WCAG (4.5 = AA normal, 3.0 = AA large) */
export function contrastRatio(hex: string, against: '#ffffff' | '#000000'): number {
  const L = hexLuminance(hex);
  const Lb = against === '#ffffff' ? 1 : 0;
  return (Math.max(L, Lb) + 0.05) / (Math.min(L, Lb) + 0.05);
}

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
        // Sidebar clara no modo light → logo colorida; dark/penumbra → logo branca
        if (resolvedTheme === 'dark' || resolvedTheme === 'penumbra') {
          return brand.logos.light;
        }
        return brand.logos.primary;
      
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
