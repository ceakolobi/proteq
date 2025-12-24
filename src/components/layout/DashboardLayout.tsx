import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  UserCircle,
  Bell,
  BarChart3,
} from 'lucide-react';
import { roleLabels } from '@/types/database';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Comercial',
    items: [
      {
        title: 'Leads',
        href: '/leads',
        icon: <UserCircle className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Cotações',
        href: '/cotacao',
        icon: <DollarSign className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Associados',
        href: '/associados',
        icon: <Users className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas', 'cadastro'],
      },
      {
        title: 'Veículos',
        href: '/veiculos',
        icon: <Car className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas', 'cadastro'],
      },
    ],
  },
  {
    title: 'Operacional',
    items: [
      {
        title: 'Vistorias',
        href: '/relatorios',
        icon: <ClipboardCheck className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'vistoriador'],
      },
      {
        title: 'Financeiro',
        href: '/relatorios',
        icon: <CreditCard className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'financeiro'],
      },
      {
        title: 'Relatórios',
        href: '/relatorios',
        icon: <BarChart3 className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
    ],
  },
  {
    title: 'Gestão',
    items: [
      {
        title: 'Painel Regional',
        href: '/regional',
        icon: <Building2 className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional'],
      },
      {
        title: 'Painel Consultor',
        href: '/consultor',
        icon: <UserCircle className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional', 'consultor_vendas'],
      },
      {
        title: 'Consultores',
        href: '/consultores',
        icon: <Users className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional'],
      },
    ],
  },
  {
    title: 'Administração',
    items: [
      {
        title: 'Painel Admin',
        href: '/admin',
        icon: <Shield className="h-5 w-5" />,
        roles: ['admin_principal'],
      },
      {
        title: 'Usuários',
        href: '/usuarios',
        icon: <Users className="h-5 w-5" />,
        roles: ['admin_principal'],
      },
      {
        title: 'Cotas',
        href: '/cotas',
        icon: <DollarSign className="h-5 w-5" />,
        roles: ['admin_principal'],
      },
      {
        title: 'Sedes',
        href: '/sedes',
        icon: <Building2 className="h-5 w-5" />,
        roles: ['admin_principal', 'admin_regional'],
      },
      {
        title: 'Configurações',
        href: '/admin',
        icon: <Settings className="h-5 w-5" />,
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

  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(filterItem),
    }))
    .filter(section => section.items.length > 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="p-2 bg-primary rounded-lg">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-sidebar-foreground">MARKA CRM</h1>
          <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-4">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={`${section.title}-${item.href}-${item.title}`}
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.nome_completo ? getInitials(profile.nome_completo) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {profile?.nome_completo || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isAdminPrincipal 
                    ? roleLabels.admin_principal 
                    : roles[0] ? roleLabels[roles[0]] : 'Sem perfil'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">MARKA CRM</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile?.nome_completo ? getInitials(profile.nome_completo) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {profile?.nome_completo || 'Usuário'}
              </DropdownMenuLabel>
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
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
