import { useTheme as useNextTheme } from "next-themes";

export type Theme = "light" | "dark" | "penumbra";

export const useAppTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  return {
    theme: theme as Theme,
    setTheme: (t: Theme) => setTheme(t),
    resolvedTheme: resolvedTheme as Theme,
  };
};

export const themeOptions = [
  { value: "light", label: "Claro", description: "Tema claro padrão" },
  { value: "dark", label: "Escuro", description: "Tema escuro completo" },
  { value: "penumbra", label: "Penumbra", description: "Suave para os olhos" },
] as const;
