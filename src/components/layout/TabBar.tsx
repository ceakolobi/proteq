import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTabManager } from '@/contexts/TabManagerContext';
import { TAB_REGISTRY } from '@/config/tabRegistry';
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';

export function TabBar() {
  const tm = useTabManager();
  if (!tm) return null;

  const { tabs, activeId, maximized, focusTab, closeTab, minimizeTab, restoreTab, toggleMaximize } = tm;

  const visibleTabs = tabs.filter((t) => !t.minimized);
  const minimizedTabs = tabs.filter((t) => t.minimized);

  return (
    <div className="border-b border-border/60 bg-muted/30">
      {/* Linha de abas ativas */}
      <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const def = TAB_REGISTRY[tab.path];
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              onClick={() => focusTab(tab.id)}
              className={cn(
                'group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-t-md text-sm cursor-pointer border border-b-0 transition-colors select-none',
                isActive
                  ? 'bg-background border-border text-foreground font-medium'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="shrink-0">{def?.icon}</span>
              <span className="whitespace-nowrap">{tab.title}</span>
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); minimizeTab(tab.id); }}
                  className="p-0.5 rounded hover:bg-muted-foreground/20"
                  title="Minimizar"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                  title="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Botão maximizar (à direita) */}
        <div className="ml-auto pr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleMaximize}
            title={maximized ? 'Restaurar layout' : 'Maximizar'}
          >
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Bandeja de abas minimizadas */}
      {minimizedTabs.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-t border-border/40">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Minimizadas:</span>
          {minimizedTabs.map((tab) => {
            const def = TAB_REGISTRY[tab.path];
            return (
              <button
                key={tab.id}
                onClick={() => restoreTab(tab.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                title={`Restaurar ${tab.title}`}
              >
                {def?.icon}
                {tab.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
