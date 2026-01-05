import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PERMISSION_MODULES, 
  PERMISSION_ACTIONS, 
  PermissionMatrix,
  PermissionModule,
  PermissionAction,
} from '@/hooks/useUserPermissions';
import { Shield, Eye, Plus, Pencil, Trash2 } from 'lucide-react';

interface PermissionEditorProps {
  permissions: PermissionMatrix;
  onChange: (permissions: PermissionMatrix) => void;
  disabled?: boolean;
  isAdminPrincipal?: boolean;
}

const ACTION_ICONS: Record<PermissionAction, React.ReactNode> = {
  visualizar: <Eye className="h-3 w-3" />,
  criar: <Plus className="h-3 w-3" />,
  editar: <Pencil className="h-3 w-3" />,
  excluir: <Trash2 className="h-3 w-3" />,
};

export function PermissionEditor({ 
  permissions, 
  onChange, 
  disabled = false,
  isAdminPrincipal = false,
}: PermissionEditorProps) {
  const handleToggle = (module: PermissionModule, action: PermissionAction) => {
    if (disabled || isAdminPrincipal) return;

    const newPermissions = { ...permissions };
    if (!newPermissions[module]) {
      newPermissions[module] = {};
    }
    newPermissions[module][action] = !newPermissions[module][action];
    onChange(newPermissions);
  };

  const handleToggleModule = (module: PermissionModule) => {
    if (disabled || isAdminPrincipal) return;

    const newPermissions = { ...permissions };
    const allChecked = PERMISSION_ACTIONS.every(
      act => newPermissions[module]?.[act.id]
    );

    if (!newPermissions[module]) {
      newPermissions[module] = {};
    }

    PERMISSION_ACTIONS.forEach(act => {
      newPermissions[module][act.id] = !allChecked;
    });

    onChange(newPermissions);
  };

  const isModuleFullyChecked = (module: PermissionModule) => {
    return PERMISSION_ACTIONS.every(act => permissions[module]?.[act.id]);
  };

  const isModulePartiallyChecked = (module: PermissionModule) => {
    const checked = PERMISSION_ACTIONS.filter(act => permissions[module]?.[act.id]);
    return checked.length > 0 && checked.length < PERMISSION_ACTIONS.length;
  };

  if (isAdminPrincipal) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Permissões do Admin Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="default" className="bg-primary">Acesso Total</Badge>
            <span>O Admin Principal possui todas as permissões do sistema.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          Permissões de Acesso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
            <div>Módulo</div>
            {PERMISSION_ACTIONS.map(action => (
              <div key={action.id} className="flex items-center gap-1 justify-center">
                {ACTION_ICONS[action.id]}
                {action.label}
              </div>
            ))}
          </div>

          {/* Permission rows */}
          {PERMISSION_MODULES.map(module => (
            <div 
              key={module.id} 
              className="grid grid-cols-5 gap-2 items-center py-1 hover:bg-muted/50 rounded-md px-1"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isModuleFullyChecked(module.id)}
                  onCheckedChange={() => handleToggleModule(module.id)}
                  disabled={disabled}
                  className={isModulePartiallyChecked(module.id) ? 'opacity-50' : ''}
                />
                <Label className="text-sm font-medium cursor-pointer">
                  {module.label}
                </Label>
              </div>

              {PERMISSION_ACTIONS.map(action => (
                <div key={action.id} className="flex justify-center">
                  <Checkbox
                    checked={permissions[module.id]?.[action.id] || false}
                    onCheckedChange={() => handleToggle(module.id, action.id)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {disabled && !isAdminPrincipal && (
          <p className="text-xs text-muted-foreground mt-4">
            Apenas o Admin Principal pode modificar permissões.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
