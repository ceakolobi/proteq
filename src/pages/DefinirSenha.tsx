import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/hooks/useBrand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

const schema = z
  .object({
    novaSenha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    confirmar: z.string().min(8, 'Confirme a senha.'),
  })
  .refine(v => v.novaSenha === v.confirmar, {
    message: 'As senhas não conferem.',
    path: ['confirmar'],
  });

export default function DefinirSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brand, getLogoForContext } = useBrand();
  const { clearSenhaProvisoria, refreshProfile } = useAuth();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionPronta, setSessionPronta] = useState(false);

  useEffect(() => {
    // Modo 1 (link): aguarda o evento PASSWORD_RECOVERY que chega no hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionPronta(true);
      }
    });

    // Modo 2 (senha provisória): usuário já está autenticado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionPronta(true);
    });

    // Limpar tokens do hash após o Supabase processar
    const hash = window.location.hash;
    if (hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      schema.parse({ novaSenha, confirmar });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ variant: 'destructive', title: 'Dados inválidos', description: err.issues[0]?.message });
      }
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao definir senha', description: error.message });
      setIsLoading(false);
      return;
    }

    // Zerar flag senha_provisoria (relevante para Modo 2)
    await clearSenhaProvisoria();
    await refreshProfile();

    toast({ title: 'Senha definida com sucesso!', description: 'Você já pode acessar o sistema.' });

    setIsLoading(false);
    navigate('/dashboard', { replace: true });
  };

  const logo = getLogoForContext('auth');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {logo && <img src={logo} alt={brand.name} className="h-10 mx-auto object-contain" />}
          <div>
            <CardTitle>Definir senha de acesso</CardTitle>
            <CardDescription>
              Escolha uma senha segura para acessar o painel Harmony
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!sessionPronta ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">
              Validando link de acesso…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nova-senha"
                    type={showNova ? 'text' : 'password'}
                    className="pl-10 pr-10"
                    placeholder="Mínimo 8 caracteres"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNova(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmar-senha"
                    type={showConfirmar ? 'text' : 'password'}
                    className="pl-10 pr-10"
                    placeholder="Repita a senha"
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Salvando…' : 'Definir senha e entrar'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
