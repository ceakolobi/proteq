import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemInfo } from '@/hooks/useSystemInfo';
import { usePWA } from '@/hooks/usePWA';
import { useBrand } from '@/hooks/useBrand';
import { useIsDemo } from '@/hooks/useIsDemo';
import { MobileNavBar } from '@/components/pwa/MobileNavBar';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { EmilyChat } from '@/components/emily/EmilyChat';
import { supabase } from '@/integrations/supabase/client';
import { 
  PermissionModule, 
  PermissionMatrix,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
} from '@/hooks/useUserPermissions';

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
  Shield,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { roleLabels } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForcarTrocaSenha } from '@/hooks/useForcarTrocaSenha';
import { useSettings } from '@/hooks/useSettings';


interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  module?: PermissionModule; // Link to permission module for granular control
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

/**
 * Navegação com permissões RBAC simplificadas:
 * - admin_principal: Acesso total
 * - admin_nivel_basico (Admin Básico): Acesso completo (exceto config do admin_principal)
 * - gerente: Acesso operacional da unidade (sem config global, cotas ou usuários)
 * - consultor_vendas (Consultor): Acesso ao próprio funil
 * 
 * Roles legadas mantidas para compatibilidade:
 * - admin_regional: Mapeado para admin_nivel_basico
 * - financeiro, cadastro, vistoriador: Acesso específico
 */
const navSections: NavSection[] = [
  {
    title: 'Principal',
    icon: <LayoutDashboard className="h-4 w-4" />,
    items: [
      {
        title: 'Painel',
        href: '/dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        module: 'dashboard',
        // Todos têm acesso ao dashboard (cada um vê sua versão)
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
        module: 'leads',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
      },
      {
        title: 'Cotações',
        href: '/cotacoes',
        icon: <FileText className="h-4 w-4" />,
        module: 'cotacoes',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
      },
      {
        title: 'Simulador',
        href: '/cotacao',
        icon: <DollarSign className="h-4 w-4" />,
        module: 'cotacoes',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
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
        module: 'dashboard',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente'],
      },
      {
        title: 'Painel Consultor',
        href: '/consultor',
        icon: <UserCircle className="h-4 w-4" />,
        module: 'dashboard',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas'],
      },
      {
        title: 'Consultores',
        href: '/consultores',
        icon: <Users className="h-4 w-4" />,
        module: 'usuarios',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'financeiro'],
      },
      {
        title: 'Sedes',
        href: '/sedes',
        icon: <Building2 className="h-4 w-4" />,
        module: 'configuracoes',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional'],
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
        module: 'associados',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro'],
      },
      {
        title: 'Veículos',
        href: '/veiculos',
        icon: <Car className="h-4 w-4" />,
        module: 'veiculos',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro'],
      },
      {
        title: 'Ativações',
        href: '/ativacoes',
        icon: <Shield className="h-4 w-4" />,
        module: 'contratos',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'consultor_vendas', 'cadastro', 'financeiro'],
      },
      {
        title: 'Vistorias',
        href: '/vistorias',
        icon: <ClipboardCheck className="h-4 w-4" />,
        module: 'vistorias',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'vistoriador'],
      },
      {
        title: 'Usuários',
        href: '/usuarios',
        icon: <UserCog className="h-4 w-4" />,
        module: 'usuarios',
        roles: ['admin_principal', 'admin_nivel_basico'],
      },
      {
        title: 'Relatórios',
        href: '/relatorios',
        icon: <BarChart3 className="h-4 w-4" />,
        module: 'relatorios',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'gerente', 'financeiro'],
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
        module: 'financeiro',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional', 'financeiro'],
      },
      {
        title: 'Cotas',
        href: '/cotas',
        icon: <DollarSign className="h-4 w-4" />,
        module: 'cotas',
        roles: ['admin_principal', 'admin_nivel_basico'],
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
        module: 'configuracoes',
        roles: ['admin_principal', 'admin_nivel_basico'],
      },
      {
        title: 'Configurações',
        href: '/configuracoes',
        icon: <Settings className="h-4 w-4" />,
        module: 'configuracoes',
        roles: ['admin_principal', 'admin_nivel_basico'],
      },
      {
        title: 'Documentos e Contratos',
        href: '/configuracoes/documentos-contratos',
        icon: <FileText className="h-4 w-4" />,
        module: 'configuracoes',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional'],
      },
      {
        title: 'Benefícios Extras',
        href: '/configuracoes/beneficios-extras',
        icon: <Wrench className="h-4 w-4" />,
        module: 'configuracoes',
        roles: ['admin_principal', 'admin_nivel_basico', 'admin_regional'],
      },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  useForcarTrocaSenha();
  const { profile, roles, isAdminPrincipal, signOut, user } = useAuth();
  const { isDemo } = useIsDemo();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isPWAMode, isStandalone } = usePWA();
  const { brand, getLogoForContext } = useBrand();
  const [userPermissions, setUserPermissions] = useState<PermissionMatrix>({});

  // Load user permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id || isAdminPrincipal) return;

      try {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        // Convert to matrix format
        const matrix: PermissionMatrix = {};
        PERMISSION_MODULES.forEach(mod => {
          matrix[mod.id] = {};
          PERMISSION_ACTIONS.forEach(act => {
            const perm = data?.find(
              (p: any) => p.module === mod.id && p.action === act.id
            );
            matrix[mod.id][act.id] = perm?.granted || false;
          });
        });
        setUserPermissions(matrix);
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };

    loadPermissions();
  }, [user?.id, isAdminPrincipal]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Check if user has permission to view a module
  // Verifica se o usuário tem permissões granulares carregadas
  const hasAnyGranularPermissions = Object.keys(userPermissions).length > 0;

  const hasModulePermission = useCallback((module?: PermissionModule): boolean => {
    if (isAdminPrincipal) return true;
    if (!module) return true; // No module restriction
    
    // Se tem permissões granulares, usa APENAS elas (prioridade absoluta)
    if (hasAnyGranularPermissions) {
      const modulePerms = userPermissions[module];
      return modulePerms?.['visualizar'] === true;
    }
    
    // Fallback: sem permissões granulares, libera para verificação por role
    return true;
  }, [isAdminPrincipal, userPermissions, hasAnyGranularPermissions]);

  const filterItem = useCallback((item: NavItem) => {
    // Admin principal always has access
    if (isAdminPrincipal) return true;
    
    // Se o usuário tem permissões granulares cadastradas, usa APENAS elas
    if (hasAnyGranularPermissions && item.module) {
      return hasModulePermission(item.module);
    }
    
    // Fallback: sem permissões granulares, usa verificação por role
    if (item.roles) {
      return item.roles.some(role => roles.includes(role as any));
    }
    
    return true;
  }, [roles, isAdminPrincipal, hasAnyGranularPermissions, hasModulePermission]);

  const filteredSections = useMemo(() => 
    navSections
      .map(section => ({
        ...section,
        items: section.items.filter(filterItem),
      }))
      .filter(section => section.items.length > 0),
    [filterItem]
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

  const getInitials = (name?: string | null) => {
    const safe = (name || '').trim();
    if (!safe) return '';

    return safe
      .split(' ')
      .filter(Boolean)
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
      {/* Logo dinâmica baseada no tema */}
      <div className="flex items-center justify-center px-5 py-4 border-b border-sidebar-border/50">
        <img 
          src={getLogoForContext('sidebar')} 
          alt={brand.name}
          className="h-10 w-auto object-contain"
        />
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
          © {new Date().getFullYear()} Harmony Clube de Benefícios
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
      {/* Demo Banner */}
      <DemoBanner />
      
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-56 lg:border-r lg:border-sidebar-border/50 lg:bg-sidebar lg:shadow-sm",
        isDemo && "lg:top-10"
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop Header */}
      <header className={cn(
        "hidden lg:flex fixed left-56 right-0 z-40 h-14 items-center justify-end px-6 border-b border-border/50 bg-card/95 backdrop-blur-sm",
        isDemo ? "top-10" : "top-0"
      )}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden sticky z-50 flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/95 backdrop-blur-sm",
        isDemo ? "top-10" : "top-0"
      )}>
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
            <img 
              src={getLogoForContext('header')} 
              alt={brand.name}
              className="h-6 object-contain"
            />
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
      <main className={cn(
        "lg:pl-56 min-h-[calc(100vh-3.5rem)] flex flex-col",
        isDemo ? "lg:pt-24" : "lg:pt-14",
        isPWAMode && "pb-20" // Espaço para a barra de navegação mobile
      )}>
        <div className="p-4 lg:p-6 flex-1">
          {children}
        </div>
        {!isPWAMode && <SystemFooter />}
      </main>

      {/* Mobile Bottom Navigation - Apenas em modo PWA/mobile */}
      {isPWAMode && <MobileNavBar />}

      {/* Emily — Consultora IA flutuante
          Visível apenas para roles com acesso ao CRM (não para associados nem vistoriadores) */}
      {!isPWAMode && (
        isAdminPrincipal ||
        roles?.some(r => ['admin_regional', 'financeiro', 'cadastro', 'consultor_vendas'].includes(r))
      ) && (
        <EmilyChat
          context="consultor"
          userId={user?.id}
          consultorId={profile?.id}
          isAdmin={isAdminPrincipal || roles?.includes('admin_regional')}
          onStartCotacao={() => navigate('/cotacoes')}
        />
      )}
    </div>
  );
}

function SystemFooter() {
  const { systemInfo, isLoading: versionLoading } = useSystemInfo();
  const { settings, isLoading: settingsLoading } = useSettings();

  if (versionLoading || settingsLoading) return null;

  const releaseDate = systemInfo?.release_date
    ? format(new Date(systemInfo.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  const contatos = [
    settings.telefone,
    settings.email,
    settings.site,
    (settings as any).instagram ? `@${(settings as any).instagram}` : null,
  ].filter(Boolean) as string[];

  return (
    <footer className="border-t border-border/50 bg-muted/30 py-3 px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {systemInfo && (
            <span>v<strong className="text-foreground">{systemInfo.system_version}</strong></span>
          )}
          {contatos.length > 0 && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{contatos.join(' · ')}</span>
            </>
          )}
        </div>
        {releaseDate && <span className="hidden sm:inline">Atualizado em {releaseDate}</span>}
      </div>
    </footer>
  );
}
