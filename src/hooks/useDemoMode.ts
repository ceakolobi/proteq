import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

const DEMO_EMAIL = 'demo@marka.com.br';

export function useDemoMode() {
  const { user, profile, roles } = useAuth();

  const isDemoUser = useMemo(() => {
    // Verifica por email
    if (user?.email === DEMO_EMAIL) return true;
    if (profile?.email === DEMO_EMAIL) return true;
    
    // Verifica por role (cast para any porque demo_user foi adicionado dinamicamente)
    if ((roles as string[]).includes('demo_user')) return true;
    
    return false;
  }, [user, profile, roles]);

  const demoRestrictions = useMemo(() => ({
    canEditSettings: !isDemoUser,
    canDeleteData: !isDemoUser,
    canEditFinanceiro: !isDemoUser,
    canEditUsuarios: !isDemoUser,
    canExportData: !isDemoUser,
    canSendEmails: !isDemoUser,
    canUploadFiles: !isDemoUser,
  }), [isDemoUser]);

  const showDemoWarning = (action: string) => {
    return `Ação "${action}" desabilitada no modo demonstração.`;
  };

  return {
    isDemoUser,
    demoRestrictions,
    showDemoWarning,
    DEMO_EMAIL,
  };
}

export const DEMO_CREDENTIALS = {
  email: 'demo@marka.com.br',
  password: 'demo123',
};
