import DashboardLayout from '@/components/layout/DashboardLayout';
import { TabBar } from '@/components/layout/TabBar';
import { ShellSlotContext, useTabManager } from '@/contexts/TabManagerContext';
import { TAB_REGISTRY } from '@/config/tabRegistry';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function TabShell() {
  const tm = useTabManager();

  if (!tm) return null;
  const { tabs, activeId } = tm;

  return (
    <DashboardLayout>
      {/* Cancela o padding do <main> para a TabBar ficar rente ao topo */}
      <div className="-m-4 lg:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
        <TabBar />

        {/* Conteúdo das abas — todas montadas, só a ativa visível */}
        <ShellSlotContext.Provider value={true}>
          <div className="flex-1 p-4 lg:p-6">
            {tabs.map((tab) => {
              const def = TAB_REGISTRY[tab.path];
              if (!def) return null;
              const Component = def.Component;
              const visible = tab.id === activeId && !tab.minimized;
              return (
                <div key={tab.id} style={{ display: visible ? 'block' : 'none' }}>
                  <ErrorBoundary label={`aba: ${def.title}`} compact>
                    <Component />
                  </ErrorBoundary>
                </div>
              );
            })}

            {tabs.length === 0 && (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Nenhuma aba aberta. Escolha um item no menu lateral.
              </div>
            )}
          </div>
        </ShellSlotContext.Provider>
      </div>
    </DashboardLayout>
  );
}
