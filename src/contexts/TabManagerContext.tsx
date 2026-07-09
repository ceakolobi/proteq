import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { TAB_REGISTRY } from '@/config/tabRegistry';

export interface OpenTab {
  id: string;      // = path (único por rota)
  path: string;
  title: string;
  minimized: boolean;
}

interface TabManagerContextType {
  tabs: OpenTab[];
  activeId: string | null;
  maximized: boolean;
  openTab: (path: string) => void;
  closeTab: (id: string) => void;
  focusTab: (id: string) => void;
  minimizeTab: (id: string) => void;
  restoreTab: (id: string) => void;
  toggleMaximize: () => void;
  isRegistered: (path: string) => boolean;
}

const TabManagerContext = createContext<TabManagerContextType | undefined>(undefined);

// Flag lida pelo DashboardLayout: quando true, ele renderiza só o conteúdo (sem moldura)
export const ShellSlotContext = createContext(false);
export const useInsideShell = () => useContext(ShellSlotContext);

const STORAGE_KEY = 'harmony_open_tabs_v1';
const DEFAULT_PATH = '/dashboard';

interface PersistedState {
  tabs: OpenTab[];
  activeId: string | null;
}

function loadPersisted(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      // Filtra rotas que não estão mais registradas
      const validTabs = (parsed.tabs || []).filter((t) => TAB_REGISTRY[t.path]);
      if (validTabs.length > 0) {
        return { tabs: validTabs, activeId: parsed.activeId ?? validTabs[0].id };
      }
    }
  } catch {
    /* ignora */
  }
  // Estado inicial: só a aba Painel
  const def = TAB_REGISTRY[DEFAULT_PATH];
  return {
    tabs: [{ id: DEFAULT_PATH, path: DEFAULT_PATH, title: def?.title ?? 'Painel', minimized: false }],
    activeId: DEFAULT_PATH,
  };
}

export function TabManagerProvider({ children }: { children: ReactNode }) {
  const initial = loadPersisted();
  const [tabs, setTabs] = useState<OpenTab[]>(initial.tabs);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeId }));
    } catch {
      /* ignora quota */
    }
  }, [tabs, activeId]);

  const isRegistered = useCallback((path: string) => Boolean(TAB_REGISTRY[path]), []);

  const openTab = useCallback((path: string) => {
    const def = TAB_REGISTRY[path];
    if (!def) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.id === path);
      if (existing) {
        // Já existe: apenas restaura (se minimizada) e foca
        return prev.map((t) => (t.id === path ? { ...t, minimized: false } : t));
      }
      return [...prev, { id: path, path, title: def.title, minimized: false }];
    });
    setActiveId(path);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      setActiveId((currentActive) => {
        if (currentActive !== id) return currentActive;
        if (next.length === 0) return null;
        // Foca a aba vizinha
        const neighbor = next[Math.max(0, idx - 1)];
        return neighbor?.id ?? next[0].id;
      });
      return next;
    });
  }, []);

  const focusTab = useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, minimized: false } : t)));
    setActiveId(id);
  }, []);

  const minimizeTab = useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, minimized: true } : t)));
    setActiveId((current) => {
      if (current !== id) return current;
      // Ativa a próxima aba não-minimizada
      const visible = tabs.find((t) => t.id !== id && !t.minimized);
      return visible?.id ?? null;
    });
  }, [tabs]);

  const restoreTab = useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, minimized: false } : t)));
    setActiveId(id);
  }, []);

  const toggleMaximize = useCallback(() => setMaximized((m) => !m), []);

  return (
    <TabManagerContext.Provider
      value={{ tabs, activeId, maximized, openTab, closeTab, focusTab, minimizeTab, restoreTab, toggleMaximize, isRegistered }}
    >
      {children}
    </TabManagerContext.Provider>
  );
}

/** Retorna o contexto ou null se fora do provider (permite fallback para navigate) */
export function useTabManager() {
  return useContext(TabManagerContext) ?? null;
}
