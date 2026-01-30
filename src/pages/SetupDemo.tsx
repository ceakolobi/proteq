import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function SetupDemo() {
  const { isAdminPrincipal, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{email: string; password: string} | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminPrincipal) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await supabase.functions.invoke("setup-demo-user", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.success) {
        setCredentials(data.credentials);
        toast.success("Usuário demo configurado com sucesso!");
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao configurar demo");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configurar Demo White Label</CardTitle>
          <CardDescription>
            Cria ou reconfigura o usuário de demonstração com empresa isolada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!credentials ? (
            <Button 
              onClick={handleSetup} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Criar/Reconfigurar Usuário Demo"
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Configurado com sucesso!</span>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">E-mail</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background px-2 py-1 rounded text-sm">
                      {credentials.email}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(credentials.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Senha</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background px-2 py-1 rounded text-sm font-mono">
                      {credentials.password}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(credentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Características do Demo:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Identidade visual genérica (sem Harmony)</li>
                  <li>Dados fictícios isolados</li>
                  <li>Modo somente leitura (RLS bloqueia escritas)</li>
                  <li>Banner "Modo Demonstração" visível</li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open("/auth", "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Tela de Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
