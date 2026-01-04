import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useUserRolesBatch } from '@/hooks/useSedeRegioes';

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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, roleLabels } from '@/types/database';
import { Users, Pencil, Shield, Search, Plus, UserPlus } from 'lucide-react';

interface UserWithRole extends Profile {
  roles: AppRole[];
}

// Roles disponíveis para atribuição (exceto admin_principal que é protegido)
const AVAILABLE_ROLES: AppRole[] = [
  'admin_regional',
  'admin_nivel_basico',
  'gerente',
  'financeiro',
  'cadastro',
  'consultor_vendas',
  'operacional',
  'vistoriador',
  'recepcao',
  'demo_user'
];

export default function Usuarios() {
  // Access control: ONLY Admin Principal can access user management
  const { isAllowed, isChecking } = useAccessControl('admin_principal_only');
  const { isAdminPrincipal } = useAuth();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

  const handleOpenDialog = (user: UserWithRole) => {
    // Bloquear edição de admin principal
    if (isProtectedAdmin(user)) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'O Admin Principal não pode ser editado.',
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
    setIsCreateDialogOpen(true);
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
      // Criar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createFormData.email,
        password: createFormData.senha,
        options: {
          data: {
            nome_completo: createFormData.nome_completo,
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

      toast({
        title: 'Usuário criado',
        description: `O usuário ${createFormData.nome_completo} foi criado com sucesso.`,
      });

      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Não foi possível criar o usuário.';
      if (error.message?.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado.';
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
                                    {roleLabels[role]}
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
                            {!isProtected && (
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
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
                <Input
                  id="senha"
                  type="password"
                  value={createFormData.senha}
                  onChange={(e) => setCreateFormData({ ...createFormData, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create_role">Perfil de Acesso *</Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                {editingUser?.nome_completo} ({editingUser?.email})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdminPrincipal && (
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}