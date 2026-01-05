import { Home, FileText, Users, Plus, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', href: '/dashboard' },
  { icon: FileText, label: 'Cotações', href: '/cotacoes' },
  { icon: Plus, label: 'Nova', href: '/cotacao', isMain: true },
  { icon: Users, label: 'Leads', href: '/leads' },
  { icon: User, label: 'Perfil', href: '/perfil' },
];

export function MobileNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          if (item.isMain) {
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
              >
                <item.icon className="w-6 h-6" />
              </button>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
