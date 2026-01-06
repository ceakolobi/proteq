import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user is in demo mode
 * Demo users have the 'admin_demo' role and cannot modify any data
 */
export function useIsDemo() {
  const { isDemo, isLoading } = useAuth();
  
  const demoEmail = 'demo@demo.com';
  
  return {
    isDemo,
    isLoading,
    demoEmail,
  };
}
