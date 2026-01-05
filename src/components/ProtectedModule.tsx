import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions, PermissionModule } from '@/hooks/useUserPermissions';

interface ProtectedModuleProps {
  module: PermissionModule;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Protects a route/component based on user permissions.
 * Only renders children if the user has 'visualizar' permission for the module.
 * Admin Principal always has access.
 */
export function ProtectedModule({ 
  module, 
  children, 
  fallbackPath = '/dashboard' 
}: ProtectedModuleProps) {
  const { isAdminPrincipal, user } = useAuth();
  const { hasPermission, isLoading } = useUserPermissions(user?.id);

  // Admin principal always has access
  if (isAdminPrincipal) {
    return <>{children}</>;
  }

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Verificando permissões...
        </div>
      </div>
    );
  }

  // Check if user has view permission for this module
  if (!hasPermission(module, 'visualizar')) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Hook to check action permissions within a component.
 * Use this for conditional rendering of action buttons.
 */
export function useModulePermissions(module: PermissionModule) {
  const { isAdminPrincipal, user } = useAuth();
  const { hasPermission, isLoading } = useUserPermissions(user?.id);

  return {
    canView: isAdminPrincipal || hasPermission(module, 'visualizar'),
    canCreate: isAdminPrincipal || hasPermission(module, 'criar'),
    canEdit: isAdminPrincipal || hasPermission(module, 'editar'),
    canDelete: isAdminPrincipal || hasPermission(module, 'excluir'),
    isLoading,
  };
}
