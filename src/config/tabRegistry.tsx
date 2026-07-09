import type { ComponentType, ReactNode } from 'react';
import { LayoutDashboard, Users, Briefcase } from 'lucide-react';

import Dashboard from '@/pages/Dashboard';
import Associados from '@/pages/Associados';
import Consultores from '@/pages/Consultores';

export interface TabDef {
  path: string;
  title: string;
  icon: ReactNode;
  Component: ComponentType;
}

// POC: apenas 3 itens. Expandir depois da validação da UX.
export const TAB_REGISTRY: Record<string, TabDef> = {
  '/dashboard': { path: '/dashboard', title: 'Painel', icon: <LayoutDashboard className="h-4 w-4" />, Component: Dashboard },
  '/associados': { path: '/associados', title: 'Associados', icon: <Users className="h-4 w-4" />, Component: Associados },
  '/consultores': { path: '/consultores', title: 'Consultores', icon: <Briefcase className="h-4 w-4" />, Component: Consultores },
};
