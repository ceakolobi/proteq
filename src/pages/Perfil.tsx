import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Shield, 
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, roles, isAdminPrincipal, refreshProfile, isLoading: authLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
  });
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    document.title = 'Meu Perfil | Proteq';
  }, []);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        nome_completo: profile.nome_completo || '',
        email: profile.email || user.email || '',
        telefone: profile.telefone || '',
        cpf: profile.cpf || '',
      });
    }
  }, [profile, user]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate email format
    if (!validateEmail(formData.email.trim())) {
      toast.error('Email inválido', {
        description: 'Por favor, insira um email válido (ex: usuario@dominio.com)',
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Update email if changed
      const emailChanged = formData.email.trim().toLowerCase() !== user.email?.toLowerCase();
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email.trim(),
        });
        if (emailError) {
          // Handle specific error messages
          if (emailError.message.includes('already registered')) {
            throw new Error('Este email já está sendo usado por outra conta');
          }
          throw emailError;
        }
        toast.info('Verifique sua caixa de entrada', {
          description: `Um link de confirmação foi enviado para ${formData.email.trim()}. Você precisa confirmar o novo email para concluir a alteração.`,
          duration: 8000,
        });
      }

      // Update profile data
      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo: formData.nome_completo.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim() || null,
          cpf: formData.cpf.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      if (!emailChanged) {
        toast.success('Perfil atualizado com sucesso!');
      }
      await refreshProfile();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil', {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha', {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin_principal':
        return 'destructive';
      case 'admin_regional':
        return 'default';
      case 'consultor_vendas':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin_principal: 'Admin Principal',
      admin_regional: 'Admin Regional',
      consultor_vendas: 'Consultor de Vendas',
      financeiro: 'Financeiro',
      cadastro: 'Cadastro',
      vistoriador: 'Vistoriador',
      associado: 'Associado',
    };
    return labels[role] || role;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informações do Perfil */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Informações Pessoais</CardTitle>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span className="ml-1">Salvar</span>
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription>
                Suas informações de cadastro no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                {isEditing ? (
                  <Input
                    id="nome"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile?.nome_completo || '-'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile?.email || user?.email || '-'}</span>
                    </div>
                    {profile?.email &&
                      user?.email &&
                      profile.email.trim().toLowerCase() !== user.email.trim().toLowerCase() && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            O e-mail de login ainda é {user.email}. Confirme o link enviado para concluir a troca.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const { error } = await supabase.auth.resend({
                                  type: 'email_change',
                                  email: user.email!,
                                });
                                if (error) throw error;
                                toast.success('Novo link de confirmação enviado para ' + profile.email);
                              } catch (error: any) {
                                toast.error('Erro ao reenviar: ' + error.message);
                              }
                            }}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Reenviar link
                          </Button>
                        </div>
                      )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile?.telefone || '-'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                {isEditing ? (
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">CPF:</span>
                    <span>{profile?.cpf || '-'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roles e Permissões */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Permissões e Acesso</CardTitle>
              </div>
              <CardDescription>
                Suas permissões no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Funções (Roles)</Label>
                <div className="flex flex-wrap gap-2">
                  {isAdminPrincipal && (
                    <Badge variant="destructive">
                      Admin Principal
                    </Badge>
                  )}
                  {roles.map((role) => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)}>
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                  {roles.length === 0 && !isAdminPrincipal && (
                    <span className="text-sm text-muted-foreground">Nenhuma função atribuída</span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Sede / Regional</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.sede_id ? 'Vinculado a uma sede' : 'Sem sede vinculada'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Região</Label>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.regiao_id ? 'Vinculado a uma região' : 'Sem região vinculada'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="pt-1">
                  <Badge variant={profile?.ativo ? 'default' : 'destructive'}>
                    {profile?.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <CardTitle>Segurança</CardTitle>
                </div>
                {!isChangingPassword && (
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                    Alterar Senha
                  </Button>
                )}
              </div>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            {isChangingPassword && (
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Repita a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
