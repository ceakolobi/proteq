import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Car, Lock, Shield, CreditCard, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [loginIdentifier, setLoginIdentifier] = useState(''); // CPF ou Email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isForcedChangeMode, setIsForcedChangeMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, profile, mustChangePassword, clearMustChangePassword, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const schemas = useMemo(() => {
    const emailSchema = z.string().email('Informe um email válido.');

    const loginSchema = z.object({
      email: emailSchema,
      password: z.string().min(1, 'Informe sua senha.'),
    });

    // Reset aceita CPF ou Email na UI, mas valida email quando já resolvido
    const resetSchema = z.object({
      identifier: emailSchema,
    });

    const updatePasswordSchema = z
      .object({
        newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
        confirmNewPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
      })
      .refine((v) => v.newPassword === v.confirmNewPassword, {
        message: 'As senhas não conferem.',
        path: ['confirmNewPassword'],
      });

    return { loginSchema, resetSchema, updatePasswordSchema };
  }, []);

  const getZodMessage = (error: unknown) => {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message ?? 'Verifique os dados informados.';
    }
    return 'Verifique os dados informados.';
  };

  useEffect(() => {
    document.title = 'Acesso | MARKA CRM';

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('type') === 'recovery') {
      setIsRecoveryMode(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for forced password change after login
  useEffect(() => {
    if (!authLoading && user && profile && mustChangePassword && !isRecoveryMode) {
      setIsForcedChangeMode(true);
    }
  }, [authLoading, user, profile, mustChangePassword, isRecoveryMode]);

  // Redirect authenticated users who don't need password change
  useEffect(() => {
    if (!authLoading && user && profile && !mustChangePassword && !isRecoveryMode && !isForcedChangeMode) {
      navigate('/dashboard');
    }
  }, [authLoading, user, profile, mustChangePassword, isRecoveryMode, isForcedChangeMode, navigate]);

  // Helper to check if string is CPF (only digits, 11 chars)
  const isCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.length === 11;
  };

  // Lookup email by CPF (via backend function, pois no login ainda não há sessão)
  const getEmailByCpf = async (cpfValue: string): Promise<string | null> => {
    const cleanedCpf = cpfValue.replace(/\D/g, '').slice(0, 11);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-email-by-cpf', {
        body: { cpf: cleanedCpf },
      });

      if (error) return null;

      const email = (data as any)?.email;
      if (typeof email !== 'string') return null;
      if (!email.includes('@')) return null;
      return email;
    } catch {
      return null;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let loginEmail = loginIdentifier;

    // If identifier looks like CPF, lookup email
    if (isCpf(loginIdentifier)) {
      const foundEmail = await getEmailByCpf(loginIdentifier);
      if (!foundEmail) {
        toast({
          variant: 'destructive',
          title: 'CPF não encontrado',
          description: 'Nenhum usuário cadastrado com este CPF.',
        });
        setIsLoading(false);
        return;
      }
      loginEmail = foundEmail;
    }

    try {
      schemas.loginSchema.parse({ email: loginEmail, password });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description: getZodMessage(err),
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(loginEmail, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description:
          error.message === 'Invalid login credentials'
            ? 'Credenciais inválidas. Verifique seus dados e senha.'
            : error.message,
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      // Redirecionamento acontece via efeito quando sessão + perfil estiverem prontos
    }

    setIsLoading(false);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const identifier = resetEmail.trim();
    if (!identifier) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description: 'Informe seu CPF ou email.',
      });
      return;
    }

    setIsLoading(true);

    let targetEmail: string | null = null;

    if (identifier.includes('@')) {
      try {
        schemas.resetSchema.parse({ identifier });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Email inválido',
          description: getZodMessage(err),
        });
        setIsLoading(false);
        return;
      }
      targetEmail = identifier;
    } else if (isCpf(identifier)) {
      targetEmail = await getEmailByCpf(identifier);
      if (!targetEmail) {
        toast({
          variant: 'destructive',
          title: 'CPF não encontrado',
          description: 'Nenhum usuário cadastrado com este CPF.',
        });
        setIsLoading(false);
        return;
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description: 'Informe um CPF (11 dígitos) ou um email válido.',
      });
      setIsLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar o link',
        description: error.message,
      });
    } else {
      toast({
        title: 'Link enviado!',
        description: 'Verifique seu email para redefinir sua senha.',
      });
      setIsResetOpen(false);
    }

    setIsLoading(false);
  };

  const handleCancelRecovery = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();

    setIsRecoveryMode(false);
    setNewPassword('');
    setConfirmNewPassword('');

    // Remove tokens do hash da URL
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    setIsLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      schemas.updatePasswordSchema.parse({ newPassword, confirmNewPassword });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description: getZodMessage(err),
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Clear the must_change_password flag if this was a forced change
    if (isForcedChangeMode) {
      await clearMustChangePassword();
      setIsForcedChangeMode(false);
    }

    toast({
      title: 'Senha atualizada!',
      description: 'Você já pode acessar o sistema com a nova senha.',
    });

    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    setIsRecoveryMode(false);
    setNewPassword('');
    setConfirmNewPassword('');

    setIsLoading(false);
    navigate('/dashboard');
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary-foreground/20 rounded-xl">
              <Shield className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">MARKA CRM</h1>
              <p className="text-primary-foreground/80">Sistema de Gestão</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg mt-1">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestão Completa</h3>
                <p className="text-primary-foreground/70 text-sm">
                  Gerencie associados, veículos e cotações de forma simples e eficiente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg mt-1">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Segurança em Primeiro Lugar</h3>
                <p className="text-primary-foreground/70 text-sm">
                  Sistema privado com controle de acesso por perfil e auditoria completa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-foreground/5 rounded-full" />
        <div className="absolute -top-20 -right-10 w-60 h-60 bg-primary-foreground/5 rounded-full" />
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <div className="p-2 bg-primary rounded-lg">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">MARKA CRM</span>
            </div>

            <CardTitle className="text-2xl font-bold">
              {isRecoveryMode || isForcedChangeMode ? 'Redefinir senha' : 'Acesse sua conta'}
            </CardTitle>
            <CardDescription>
              {isRecoveryMode
                ? 'Defina uma nova senha para sua conta.'
                : isForcedChangeMode
                ? 'Você precisa alterar sua senha para continuar.'
                : 'Sistema interno de gestão da associação'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {(isRecoveryMode || isForcedChangeMode) ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {isRecoveryMode && (
                    <Button type="button" variant="ghost" className="flex-1" onClick={handleCancelRecovery} disabled={isLoading}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" className={isRecoveryMode ? "flex-1" : "w-full"} disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar nova senha'}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-identifier">CPF ou Email</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-identifier"
                        type="text"
                        placeholder="Digite seu CPF ou email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Use seu CPF (apenas números) ou email</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-login">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password-login"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => {
                        setResetEmail(loginIdentifier);
                        setIsResetOpen(true);
                      }}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recuperar senha</DialogTitle>
                      <DialogDescription>
                        Enviaremos um link para você criar uma nova senha.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendResetEmail} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-identifier">CPF ou Email</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reset-identifier"
                            type="text"
                            placeholder="Digite seu CPF ou email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Se informar CPF, enviaremos para o email cadastrado.</p>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsResetOpen(false)} disabled={isLoading}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Enviando...' : 'Enviar link'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

