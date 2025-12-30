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
import { Users, Pencil, Shield, Search } from 'lucide-react';

interface UserWithRole extends Profile {
  roles: AppRole[];
}

export default function Usuarios() {
  // Access control: ONLY Admin Principal can access user management
  const { isAllowed, isChecking } = useAccessControl('admin_principal_only');
  const { isAdminPrincipal } = useAuth();
  
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
  });

  const fetchData = async () => {
    if (!isAllowed) return;
    
    try {
      // Admin Principal sees all users
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

  // Show loading while checking access
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const handleOpenDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setFormData({
      role: user.roles[0] || '',
      sede_id: user.sede_id || '',
      regiao_id: user.regiao_id || '',
      ativo: user.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    // Proteção extra: não permitir edição de admin protegido (email admin@system.com)
    if (editingUser.email === 'admin@system.com') {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'Este usuário administrador não pode ser alterado.',
      });
      return;
    }

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          sede_id: formData.sede_id || null,
          regiao_id: formData.regiao_id || null,
          ativo: formData.ativo,
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
    }
  };

  const filteredUsers = users.filter(user => 
    user.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Admin Principal can assign any role except admin_principal
  const availableRoles: AppRole[] = ['admin_regional', 'financeiro', 'cadastro', 'consultor_vendas', 'vistoriador', 'associado'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e permissões do sistema
            </p>
          </div>
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
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_admin_principal && (
                              <Shield className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-medium">{user.nome_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.is_admin_principal ? (
                              <Badge className="bg-primary">Admin Principal</Badge>
                            ) : getRoles(user.id).length > 0 ? (
                              getRoles(user.id).map((role) => (
                                <Badge key={role} variant="secondary">
                                  {roleLabels[role as AppRole]}
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
                          {!user.is_admin_principal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog({ ...user, roles: getRoles(user.id) as AppRole[] })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
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
                    {availableRoles.map((role) => (
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
                      onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sede" />
                      </SelectTrigger>
                      <SelectContent>
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
                      onValueChange={(value) => setFormData({ ...formData, regiao_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma região" />
                      </SelectTrigger>
                      <SelectContent>
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
