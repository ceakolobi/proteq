import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemInfo } from '@/hooks/useSystemInfo';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  DollarSign,
  Car,
  FileText,
  ClipboardCheck,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Bell,
  BarChart3,
  Briefcase,
  Wrench,
  UserCog,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { roleLabels } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    icon: <LayoutDashboard className="h-4 w-4" />,
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Comercial',
    icon: <Briefcase className="h-4 w-4" />,
    items: [
      {
        title: 'Leads',
        href: '/leads',
        icon: <UserCircle className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Cotações',
        href: '/cotacoes',
        icon: <FileText className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Simulador',
        href: '/cotacao',
        icon: <DollarSign className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
    ],
  },
  {
    title: 'Gestão',
    icon: <UserCog className="h-4 w-4" />,
    items: [
      {
        title: 'Painel Regional',
        href: '/regional',
        icon: <Building2 className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional'],
      },
      {
        title: 'Painel Consultor',
        href: '/consultor',
        icon: <UserCircle className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Consultores',
        href: '/consultores',
        icon: <Users className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional'],
      },
      {
        title: 'Sedes',
        href: '/sedes',
        icon: <Building2 className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional'],
      },
    ],
  },
  {
    title: 'Cadastro',
    icon: <Users className="h-4 w-4" />,
    items: [
      {
        title: 'Associados',
        href: '/associados',
        icon: <Users className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas', 'cadastro'],
      },
      {
        title: 'Veículos',
        href: '/veiculos',
        icon: <Car className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas', 'cadastro'],
      },
      {
        title: 'Ativações',
        href: '/ativacoes',
        icon: <Shield className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'cadastro', 'financeiro', 'consultor_vendas'],
      },
      {
        title: 'Relatórios',
        href: '/relatorios',
        icon: <BarChart3 className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas', 'financeiro'],
      },
    ],
  },
  {
    title: 'Finanças',
    icon: <CreditCard className="h-4 w-4" />,
    items: [
      {
        title: 'Financeiro',
        href: '/financeiro',
        icon: <CreditCard className="h-4 w-4" />,
        roles: ['admin_principal', 'admin_regional', 'financeiro'],
      },
      {
        title: 'Cotas',
        href: '/cotas',
        icon: <DollarSign className="h-4 w-4" />,
        roles: ['admin_principal'],
      },
    ],
  },
  {
    title: 'Administração',
    icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      {
        title: 'Painel Admin',
        href: '/admin',
        icon: <Shield className="h-4 w-4" />,
        roles: ['admin_principal'],
      },
      {
        title: 'Usuários',
        href: '/usuarios',
        icon: <Users className="h-4 w-4" />,
        roles: ['admin_principal'],
      },
      {
        title: 'Configurações',
        href: '/configuracoes',
        icon: <Settings className="h-4 w-4" />,
        roles: ['admin_principal'],
      },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, roles, isAdminPrincipal, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filterItem = (item: NavItem) => {
    if (!item.roles) return true;
    if (isAdminPrincipal) return true;
    return item.roles.some(role => roles.includes(role as any));
  };

  const filteredSections = useMemo(() => 
    navSections
      .map(section => ({
        ...section,
        items: section.items.filter(filterItem),
      }))
      .filter(section => section.items.length > 0),
    [roles, isAdminPrincipal]
  );

  // Determine which sections should be open based on current path
  const openSections = useMemo(() => {
    const open: Record<string, boolean> = {};
    filteredSections.forEach(section => {
      const hasActiveItem = section.items.some(item => location.pathname === item.href);
      open[section.title] = hasActiveItem;
    });
    return open;
  }, [location.pathname, filteredSections]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(openSections);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const NavMenuItem = ({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) => {
    const isActive = location.pathname === item.href;
    
    return (
      <Link
        to={item.href}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
          'hover:bg-sidebar-accent/80',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/80 hover:text-sidebar-foreground'
        )}
      >
        <span className={cn(
          'transition-transform duration-200 group-hover:scale-110',
          isActive && 'text-primary-foreground'
        )}>
          {item.icon}
        </span>
        <span>{item.title}</span>
      </Link>
    );
  };

  const NavSection = ({ section, onNavigate }: { section: typeof filteredSections[0]; onNavigate?: () => void }) => {
    const isExpanded = expandedSections[section.title] ?? openSections[section.title];
    const hasActiveItem = section.items.some(item => location.pathname === item.href);

    // For Principal section (Dashboard), show without accordion
    if (section.title === 'Principal') {
      return (
        <div className="mb-2">
          {section.items.map((item) => (
            <NavMenuItem key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      );
    }

    return (
      <Collapsible
        open={isExpanded}
        onOpenChange={() => toggleSection(section.title)}
        className="mb-1"
      >
        <CollapsibleTrigger className="w-full">
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200',
              'hover:bg-sidebar-accent/60 cursor-pointer',
              hasActiveItem 
                ? 'text-primary bg-sidebar-accent/40' 
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                'transition-colors duration-200',
                hasActiveItem && 'text-primary'
              )}>
                {section.icon}
              </span>
              <span className="uppercase tracking-wide text-xs">{section.title}</span>
            </div>
            <span className={cn(
              'transition-transform duration-300 ease-out',
              isExpanded && 'rotate-90'
            )}>
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pl-2 pt-1 pb-2 space-y-0.5">
            {section.items.map((item) => (
              <NavMenuItem key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border/50">
        <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-md">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-base text-sidebar-foreground tracking-tight">MARKA CRM</h1>
          <p className="text-[10px] text-muted-foreground/80 font-medium">Sistema de Gestão</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-1">
          {filteredSections.map((section) => (
            <NavSection key={section.title} section={section} onNavigate={onNavigate} />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border/50">
        <p className="text-[10px] text-muted-foreground/60 text-center">
          © {new Date().getFullYear()} MARKA SOLUÇÕES EM TECNOLOGIA
        </p>
      </div>
    </div>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-3 px-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile?.nome_completo ? getInitials(profile.nome_completo) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium truncate max-w-[150px]">
              {profile?.nome_completo || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isAdminPrincipal 
                ? roleLabels.admin_principal 
                : roles[0] ? roleLabels[roles[0]] : 'Sem perfil'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/perfil')}>
          <UserCircle className="mr-2 h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-56 lg:border-r lg:border-sidebar-border/50 lg:bg-sidebar lg:shadow-sm">
        <SidebarContent />
      </aside>

      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-56 right-0 z-40 h-14 items-center justify-end px-6 border-b border-border/50 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">MARKA CRM</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-56 lg:pt-14 min-h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="p-4 lg:p-6 flex-1">
          {children}
        </div>
        <SystemFooter />
      </main>
    </div>
  );
}

function SystemFooter() {
  const { systemInfo, isLoading } = useSystemInfo();

  if (isLoading || !systemInfo) {
    return null;
  }

  const releaseDate = systemInfo.release_date 
    ? format(new Date(systemInfo.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <footer className="border-t border-border/50 bg-muted/30 py-3 px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5" />
          <span>Versão do Sistema: <strong className="text-foreground">v{systemInfo.system_version}</strong></span>
        </div>
        <span>Última atualização: {releaseDate}</span>
      </div>
    </footer>
  );
}
