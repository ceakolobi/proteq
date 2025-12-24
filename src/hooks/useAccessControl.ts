import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';
import { toast } from 'sonner';

export type PageAccess = 
  | 'admin_principal_only'
  | 'admin_regional_or_above'
  | 'consultor_or_above'
  | 'authenticated';

interface AccessControlResult {
  isAllowed: boolean;
  isChecking: boolean;
  userSedeId: string | null;
  userRegiaoId: string | null;
}

/**
 * Hook for role-based page access control
 * 
 * Hierarchy:
 * 1. Admin Principal → Full access to everything
 * 2. Admin Regional → Access to their own sede/regional only
 * 3. Consultor → Access to their own associados only
 * 4. Associado → Access to their own data only
 */
export function useAccessControl(requiredAccess: PageAccess): AccessControlResult {
  const { user, profile, roles, isAdminPrincipal, isGlobalAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [userSedeId, setUserSedeId] = useState<string | null>(null);
  const [userRegiaoId, setUserRegiaoId] = useState<string | null>(null);
  const deniedToastShownRef = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // If no user, redirect to auth
      if (!user) {
        navigate('/auth', { replace: true });
        setIsChecking(false);
        return;
      }

      // Store sede and regiao for filtering data
      setUserSedeId(profile?.sede_id || null);
      setUserRegiaoId(profile?.regiao_id || null);

      // BYPASS GLOBAL: isGlobalAdmin (admin@system.com ou Admin Principal)
      // Libera acesso total, ignora todas as validações
      if (isGlobalAdmin) {
        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      let allowed = false;

      switch (requiredAccess) {
        case 'admin_principal_only':
          // Only Admin Principal can access
          allowed = isAdminPrincipal === true;
          break;

        case 'admin_regional_or_above':
          // Admin Principal OR Admin Regional
          allowed = isAdminPrincipal === true || roles.includes('admin_regional');
          break;

        case 'consultor_or_above':
          // Admin Principal OR Admin Regional OR Consultor
          allowed = isAdminPrincipal === true || 
                   roles.includes('admin_regional') || 
                   roles.includes('consultor_vendas');
          break;

        case 'authenticated':
          // Any authenticated user
          allowed = true;
          break;

        default:
          allowed = false;
      }

      if (!allowed) {
        if (!deniedToastShownRef.current) {
          deniedToastShownRef.current = true;
          toast.error('Acesso restrito', {
            description: 'Você não tem permissão para acessar esta página.',
          });
        }

        // Redirect unauthorized users to dashboard
        navigate('/dashboard', { replace: true });
      }

      setIsAllowed(allowed);
      setIsChecking(false);
    };

    checkAccess();
  }, [user, profile, roles, isAdminPrincipal, isGlobalAdmin, authLoading, requiredAccess, navigate]);

  return {
    isAllowed,
    isChecking: authLoading || isChecking,
    userSedeId,
    userRegiaoId,
  };
}

/**
 * Check if user can view data for a specific sede
 */
export function useCanAccessSede(sedeId: string | null): boolean {
  const { profile, isAdminPrincipal, isGlobalAdmin, roles } = useAuth();
  
  // Global admin bypass
  if (isGlobalAdmin || isAdminPrincipal) return true;
  if (!sedeId) return false;
  
  // Admin Regional can only access their own sede
  if (roles.includes('admin_regional')) {
    return profile?.sede_id === sedeId;
  }
  
  return false;
}

/**
 * Check if user can view data for a specific regiao
 */
export function useCanAccessRegiao(regiaoId: string | null): boolean {
  const { profile, isAdminPrincipal, isGlobalAdmin, roles } = useAuth();
  
  // Global admin bypass
  if (isGlobalAdmin || isAdminPrincipal) return true;
  if (!regiaoId) return false;
  
  // Admin Regional and Consultor can access their own regiao
  if (roles.includes('admin_regional') || roles.includes('consultor_vendas')) {
    return profile?.regiao_id === regiaoId;
  }
  
  return false;
}

/**
 * Check if user can manage a specific associate
 */
export function useCanManageAssociado(consultorId: string | null, regiaoId: string | null): boolean {
  const { user, profile, isAdminPrincipal, isGlobalAdmin, roles } = useAuth();
  
  // Global admin bypass
  if (isGlobalAdmin || isAdminPrincipal) return true;
  
  // Admin Regional can manage associados in their regiao
  if (roles.includes('admin_regional') && regiaoId && profile?.regiao_id === regiaoId) {
    return true;
  }
  
  // Consultor can only manage their own associados
  if (roles.includes('consultor_vendas') && consultorId === user?.id) {
    return true;
  }
  
  return false;
}

/**
 * Loading message for access check
 */
export const ACCESS_CHECKING_MESSAGE = "Verificando permissões...";
