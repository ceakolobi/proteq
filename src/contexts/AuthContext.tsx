import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdminPrincipal: boolean;
  isGlobalAdmin: boolean; // Bypass global para admin@system.com ou Admin Principal
  isDemo: boolean; // Flag para usuário demo (read-only)
  mustChangePassword: boolean;
  senhaProvisoria: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nomeCompleto: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearMustChangePassword: () => Promise<void>;
  clearSenhaProvisoria: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      if (rolesData) {
        setRoles(rolesData.map((r: { role: AppRole }) => r.role));
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Mantém o estado de loading ativo até roles/perfil carregarem (evita bloqueios temporários)
  const loadIdRef = useRef(0);
  const loadUserData = async (userId: string) => {
    const loadId = ++loadIdRef.current;
    setIsLoading(true);
    await fetchProfile(userId);
    if (loadId === loadIdRef.current) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Deferir chamadas ao backend para evitar deadlocks no callback
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nomeCompleto: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome_completo: nomeCompleto,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  // Admin Principal: verifica role OU flag no perfil (para compatibilidade)
  const isAdminPrincipal = roles.includes('admin_principal') || profile?.is_admin_principal === true;

  // BYPASS GLOBAL: admin@system.com OU Admin Principal tem acesso total
  // Ignora validações de role, sede e regional
  const ADMIN_EMAIL = 'admin@system.com';
  const DEMO_EMAIL = 'demo@demo.com';
  const isGlobalAdmin = user?.email === ADMIN_EMAIL || isAdminPrincipal;

  // Demo user: has admin_demo role or demo email
  const isDemo = roles.includes('admin_demo') || user?.email === DEMO_EMAIL;

  const mustChangePassword = profile?.must_change_password === true;
  const senhaProvisoria = profile?.senha_provisoria === true;

  const hasRole = (role: AppRole) => {
    // Global admin sempre tem todas as roles
    if (isGlobalAdmin) return true;
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]) => {
    // Global admin sempre tem todas as roles
    if (isGlobalAdmin) return true;
    return checkRoles.some(role => roles.includes(role));
  };

  const clearMustChangePassword = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, must_change_password: false } : null);
    }
  };

  const clearSenhaProvisoria = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ senha_provisoria: false })
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, senha_provisoria: false } : null);
    }
  };

  const value = {
    user,
    session,
    profile,
    roles,
    isLoading,
    isAdminPrincipal,
    isGlobalAdmin,
    isDemo,
    mustChangePassword,
    senhaProvisoria,
    hasRole,
    hasAnyRole,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    clearMustChangePassword,
    clearSenhaProvisoria,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
