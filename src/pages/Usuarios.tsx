import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useUserRolesBatch } from '@/hooks/useSedeRegioes';
import { 
  useUserPermissions, 
  PermissionMatrix, 
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
} from '@/hooks/useUserPermissions';
import { PermissionEditor } from '@/components/users/PermissionEditor';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, roleLabels } from '@/types/database';
import { Users, Pencil, Shield, Search, Plus, UserPlus, Eye, EyeOff } from 'lucide-react';

interface UserWithRole extends Profile {
  roles: AppRole[];
}

// Roles disponíveis para atribuição (novas roles simplificadas)
// admin_principal é protegido e não pode ser atribuído
import { ASSIGNABLE_ROLES, ROLE_LABELS, canManageUser, canEditCredentials } from '@/config/permissions';

const AVAILABLE_ROLES: AppRole[] = ASSIGNABLE_ROLES;

export default function Usuarios() {
  // Permissões granulares com fallback por role
  const { canAccessPage, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModuleAccess('usuarios');
  
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { isAdminPrincipal, roles: currentUserRoles, profile, user } = useAuth();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Permission management
  const { savePermissions, applyDefaultPermissions } = useUserPermissions();
  const [editingPermissions, setEditingPermissions] = useState<PermissionMatrix>({});
  const [createPermissions, setCreatePermissions] = useState<PermissionMatrix>({});

  // Hooks centralizados
  const { sedes, regioes } = useReferenceData({ loadSedes: true, loadRegioes: true, filterByUserAccess: false });
  const userIds = useMemo(() => users.map(u => u.id), [users]);
  const { getRoles, isLoading: rolesLoading } = useUserRolesBatch(userIds);

  const [formData, setFormData] = useState({
    role: '' as AppRole | '',
    sede_id: '',
    regiao_id: '',
    ativo: true,
    must_change_password: false,
  });

  const [createFormData, setCreateFormData] = useState({
    nome_completo: '',
    email: '',
    senha: '',
    role: '' as AppRole | '',
    sede_id: '',
    regiao_id: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const fetchData = async () => {
    if (!isAllowed) return;
    
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo');

      if (profilesError) throw profilesError;

      setUsers(profilesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar a lista de usuários.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchData();
    }
  }, [isAllowed, isChecking]);

  // Debug logs
  useEffect(() => {
    console.log('[Usuarios] Access state:', { isChecking, isAllowed, isAdminPrincipal });
  }, [isChecking, isAllowed, isAdminPrincipal]);

  // Show loading while checking access
  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            {ACCESS_CHECKING_MESSAGE}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Not allowed - should have been redirected, but show message just in case
  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-muted-foreground">
            Redirecionando...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Verificar se é admin principal protegido
  const isProtectedAdmin = (user: Profile) => {
    return user.is_admin_principal || user.email === 'admin@system.com';
  };

  // Usar funções centralizadas de permissão
  const canManageThisUser = (targetUser: Profile) => {
    return canManageUser(
      currentUserRoles,
      isAdminPrincipal,
      targetUser.is_admin_principal,
      targetUser.email
    );
  };

  // Fetch user permissions when opening edit dialog
  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

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
      
      return matrix;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return {};
    }
  };

  const handleOpenDialog = async (user: UserWithRole) => {
    // Usar função centralizada para verificar permissão
    if (!canManageThisUser(user)) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'Você não tem permissão para editar este usuário.',
      });
      return;
    }

    setEditingUser(user);
    setFormData({
      role: user.roles[0] || '',
      sede_id: user.sede_id || '',
      regiao_id: user.regiao_id || '',
      ativo: user.ativo,
      must_change_password: (user as any).must_change_password || false,
    });

    // Load user permissions
    const userPerms = await fetchUserPermissions(user.id);
    setEditingPermissions(userPerms);

    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setCreateFormData({
      nome_completo: '',
      email: '',
      senha: '',
      role: '',
      sede_id: '',
      regiao_id: '',
    });
    // Reset permissions to empty
    setCreatePermissions({});
    setIsCreateDialogOpen(true);
  };

  // Apply default permissions when role changes
  const handleRoleChange = (role: AppRole, isCreate: boolean) => {
    const defaultPerms = applyDefaultPermissions(role);
    if (isCreate) {
      setCreateFormData(prev => ({ ...prev, role }));
      setCreatePermissions(defaultPerms);
    } else {
      setFormData(prev => ({ ...prev, role }));
      setEditingPermissions(defaultPerms);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.nome_completo || !createFormData.email || !createFormData.senha || !createFormData.role) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
      });
      return;
    }

    if (createFormData.senha.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha inválida',
        description: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Obter company_id do admin que está criando
      const adminCompanyId = profile?.company_id;

      // Criar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createFormData.email,
        password: createFormData.senha,
        options: {
          data: {
            nome_completo: createFormData.nome_completo,
            company_id: adminCompanyId, // Passar company_id para o trigger
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Aguardar o profile ser criado pelo trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar profile com sede/região
      if (createFormData.sede_id || createFormData.regiao_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            sede_id: createFormData.sede_id || null,
            regiao_id: createFormData.regiao_id || null,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Adicionar role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: createFormData.role as AppRole,
        });

      if (roleError) throw roleError;

      // Salvar permissões se for admin principal
      if (isAdminPrincipal && adminCompanyId) {
        const permissionsSaved = await savePermissions(
          authData.user.id,
          createPermissions,
          adminCompanyId
        );
        if (!permissionsSaved) {
          console.warn('Permissions could not be saved');
        }
      }

      toast({
        title: 'Usuário criado',
        description: `O usuário ${createFormData.nome_completo} foi criado com sucesso.`,
      });

      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Não foi possível criar o usuário.';
      const errorText = error.message?.toLowerCase() || '';
      const errorCode = error.code?.toLowerCase() || '';
      
      if (errorText.includes('already registered') || 
          errorText.includes('already exists') ||
          errorCode.includes('user_already_exists') ||
          error.status === 422) {
        errorMessage = 'Este email já está cadastrado no sistema.';
      } else if (errorText.includes('invalid email')) {
        errorMessage = 'O formato do email é inválido.';
      } else if (errorText.includes('password')) {
        errorMessage = 'A senha não atende aos requisitos mínimos.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    // Proteção extra: não permitir edição de admin protegido
    if (isProtectedAdmin(editingUser)) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'O Admin Principal não pode ser alterado.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          sede_id: formData.sede_id || null,
          regiao_id: formData.regiao_id || null,
          ativo: formData.ativo,
          must_change_password: formData.must_change_password,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (formData.role && formData.role !== editingUser.roles[0]) {
        // Remove old roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        // Add new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: editingUser.id,
            role: formData.role,
          });

        if (roleError) throw roleError;
      }

      // Salvar permissões se for admin principal
      if (isAdminPrincipal && profile?.company_id) {
        const permissionsSaved = await savePermissions(
          editingUser.id,
          editingPermissions,
          profile.company_id
        );
        if (!permissionsSaved) {
          console.warn('Permissions could not be saved');
        }
      }

      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas.',
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      
      // Capturar erro do trigger de proteção
      if (error.message?.includes('admin principal') || error.message?.includes('protected admin')) {
        toast({
          variant: 'destructive',
          title: 'Operação bloqueada',
          description: 'Este usuário administrador está protegido e não pode ser alterado.',
        });
        return;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o usuário.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e permissões do sistema
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Usuários
                </CardTitle>
                <CardDescription>
                  {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userRoles = getRoles(user.id) as AppRole[];
                      const isProtected = isProtectedAdmin(user);
                      const canManage = canManageThisUser(user);
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isProtected && (
                                <Shield className="h-4 w-4 text-primary" />
                              )}
                              <span className="font-medium">{user.nome_completo}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {isProtected ? (
                                <Badge className="bg-primary">Admin Principal</Badge>
                              ) : userRoles.length > 0 ? (
                                userRoles.map((role) => (
                                  <Badge key={role} variant="secondary">
                                    {ROLE_LABELS[role] || roleLabels[role]}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline">Sem perfil</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.ativo ? 'default' : 'secondary'}>
                              {user.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog({ ...user, roles: userRoles })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={createFormData.nome_completo}
                    onChange={(e) => setCreateFormData({ ...createFormData, nome_completo: e.target.value })}
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="Digite o email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createFormData.senha}
                      onChange={(e) => setCreateFormData({ ...createFormData, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create_role">Perfil Base *</Label>
                  <Select
                    value={createFormData.role}
                    onValueChange={(value) => handleRoleChange(value as AppRole, true)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role] || roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O perfil define as permissões iniciais sugeridas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create_sede">Sede (opcional)</Label>
                  <Select
                    value={createFormData.sede_id}
                    onValueChange={(value) =>
                      setCreateFormData({
                        ...createFormData,
                        sede_id: value === '__none__' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>
                          {sede.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create_regiao">Região (opcional)</Label>
                  <Select
                    value={createFormData.regiao_id}
                    onValueChange={(value) =>
                      setCreateFormData({
                        ...createFormData,
                        regiao_id: value === '__none__' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {regioes.map((regiao) => (
                        <SelectItem key={regiao.id} value={regiao.id}>
                          {regiao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Permission Editor for Create */}
              {isAdminPrincipal && createFormData.role && (
                <PermissionEditor
                  permissions={createPermissions}
                  onChange={setCreatePermissions}
                  disabled={false}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                {editingUser?.nome_completo} ({editingUser?.email})
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="role">Perfil Base</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleRoleChange(value as AppRole, false)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role] || roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Alterar o perfil irá redefinir as permissões para o padrão
                    </p>
                  </div>

                  {(isAdminPrincipal || currentUserRoles.includes('admin_nivel_basico')) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sede">Sede</Label>
                        <Select
                          value={formData.sede_id}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              sede_id: value === '__none__' ? '' : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma sede" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhuma</SelectItem>
                            {sedes.map((sede) => (
                              <SelectItem key={sede.id} value={sede.id}>
                                {sede.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="regiao">Região</Label>
                        <Select
                          value={formData.regiao_id}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              regiao_id: value === '__none__' ? '' : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma região" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhuma</SelectItem>
                            {regioes.map((regiao) => (
                              <SelectItem key={regiao.id} value={regiao.id}>
                                {regiao.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Usuário ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="must_change_password">Forçar troca de senha</Label>
                    <p className="text-xs text-muted-foreground">
                      O usuário deverá alterar a senha no próximo login
                    </p>
                  </div>
                  <Switch
                    id="must_change_password"
                    checked={formData.must_change_password}
                    onCheckedChange={(checked) => setFormData({ ...formData, must_change_password: checked })}
                  />
                </div>

                {/* Permission Editor for Edit */}
                {isAdminPrincipal && (
                  <PermissionEditor
                    permissions={editingPermissions}
                    onChange={setEditingPermissions}
                    disabled={false}
                    isAdminPrincipal={editingUser?.is_admin_principal}
                  />
                )}

                {!isAdminPrincipal && (
                  <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                    Apenas o Admin Principal pode modificar permissões de acesso.
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}