import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  description: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
}

export function ApiTokensCard() {
  const { profile, isAdminPrincipal } = useAuth();
  const { toast } = useToast();
  
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenDescription, setNewTokenDescription] = useState("");
  const [newTokenCreated, setNewTokenCreated] = useState<string | null>(null);
  
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [visibleTokenId, setVisibleTokenId] = useState<string | null>(null);

  const fetchTokens = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("api_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tokens:", error);
      toast({
        title: "Erro ao carregar tokens",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTokens(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para identificar o token.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    // Generate token using database function
    const { data: tokenData, error: tokenError } = await supabase.rpc("generate_api_token");
    
    if (tokenError) {
      toast({
        title: "Erro ao gerar token",
        description: tokenError.message,
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    const newToken = tokenData as string;

    const { error: insertError } = await supabase
      .from("api_tokens")
      .insert({
        name: newTokenName.trim(),
        token: newToken,
        description: newTokenDescription.trim() || null,
      });

    if (insertError) {
      toast({
        title: "Erro ao criar token",
        description: insertError.message,
        variant: "destructive",
      });
    } else {
      setNewTokenCreated(newToken);
      await fetchTokens();
      toast({
        title: "Token criado com sucesso!",
        description: "Copie o token agora. Ele não será exibido novamente.",
      });
    }
    
    setIsCreating(false);
  };

  const handleToggleActive = async (token: ApiToken) => {
    const { error } = await supabase
      .from("api_tokens")
      .update({ is_active: !token.is_active })
      .eq("id", token.id);

    if (error) {
      toast({
        title: "Erro ao atualizar token",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchTokens();
      toast({
        title: token.is_active ? "Token desativado" : "Token ativado",
        description: token.is_active 
          ? "O token não poderá mais ser usado para autenticação."
          : "O token está ativo novamente.",
      });
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    const { error } = await supabase
      .from("api_tokens")
      .delete()
      .eq("id", tokenId);

    if (error) {
      toast({
        title: "Erro ao excluir token",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchTokens();
      toast({
        title: "Token excluído",
        description: "O token foi removido permanentemente.",
      });
    }
  };

  const copyToClipboard = async (text: string, tokenId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTokenId(tokenId);
    setTimeout(() => setCopiedTokenId(null), 2000);
    toast({
      title: "Copiado!",
      description: "Token copiado para a área de transferência.",
    });
  };

  const maskToken = (token: string) => {
    if (token.length <= 12) return "••••••••••••";
    return token.slice(0, 8) + "••••••••" + token.slice(-4);
  };

  const resetDialog = () => {
    setNewTokenName("");
    setNewTokenDescription("");
    setNewTokenCreated(null);
    setIsDialogOpen(false);
  };

  const apiBaseUrl = `https://sbtfhtllzpurjprivqoi.supabase.co/rest/v1`;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Tokens de API
        </CardTitle>
        <CardDescription>
          Gerencie tokens de autenticação para integrações externas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instruções */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Como usar a API</p>
              <p className="text-muted-foreground">
                Use o token no cabeçalho <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization: Bearer SEU_TOKEN</code>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
                  {apiBaseUrl}/leads
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(apiBaseUrl, "base-url")}
                >
                  {copiedTokenId === "base-url" ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Lista de Tokens */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Seus Tokens</Label>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) resetDialog();
              else setIsDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {newTokenCreated ? "Token Criado!" : "Criar Novo Token"}
                  </DialogTitle>
                  <DialogDescription>
                    {newTokenCreated 
                      ? "Copie o token abaixo. Ele não será exibido novamente por segurança."
                      : "Crie um token para integrar sistemas externos com a API."}
                  </DialogDescription>
                </DialogHeader>
                
                {newTokenCreated ? (
                  <div className="space-y-4 py-4">
                    <div className="p-4 rounded-lg bg-accent/20 border border-accent">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span className="font-medium text-primary">Token gerado com sucesso</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 rounded bg-background text-xs font-mono break-all">
                          {newTokenCreated}
                        </code>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(newTokenCreated, "new-token")}
                        >
                          {copiedTokenId === "new-token" ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Guarde este token em local seguro. Ele não será exibido novamente!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="token-name">Nome do Token *</Label>
                      <Input
                        id="token-name"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        placeholder="Ex: Integração Landing Page"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token-description">Descrição (opcional)</Label>
                      <Textarea
                        id="token-description"
                        value={newTokenDescription}
                        onChange={(e) => setNewTokenDescription(e.target.value)}
                        placeholder="Descreva para que será usado este token..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  {newTokenCreated ? (
                    <Button onClick={resetDialog}>
                      Fechar
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateToken} 
                        disabled={!newTokenName.trim() || isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        Gerar Token
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum token criado ainda.</p>
              <p className="text-sm">Crie um token para começar a integrar sistemas externos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div 
                  key={token.id}
                  className={`p-4 rounded-lg border ${
                    token.is_active 
                      ? "bg-card border-border" 
                      : "bg-muted/30 border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{token.name}</span>
                        <Badge variant={token.is_active ? "default" : "secondary"}>
                          {token.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      
                      {token.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {token.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {visibleTokenId === token.id ? token.token : maskToken(token.token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setVisibleTokenId(
                            visibleTokenId === token.id ? null : token.id
                          )}
                        >
                          {visibleTokenId === token.id ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(token.token, token.id)}
                        >
                          {copiedTokenId === token.id ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          Criado em {format(new Date(token.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {token.last_used_at && (
                          <span>
                            Último uso: {format(new Date(token.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={token.is_active}
                        onCheckedChange={() => handleToggleActive(token)}
                      />
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Token?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O token "{token.name}" será permanentemente excluído e todas as integrações que o utilizam deixarão de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteToken(token.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Documentação rápida */}
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Exemplo de Integração
          </Label>
          <div className="p-4 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre-wrap">
{`curl -X POST "${apiBaseUrl}/leads" \\
  -H "apikey: SEU_ANON_KEY" \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nome": "João Silva",
    "telefone": "11999998888",
    "email": "joao@email.com",
    "consultor_id": "UUID_DO_CONSULTOR"
  }'`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            Substitua <code className="bg-muted px-1 rounded">SEU_TOKEN</code> pelo token gerado acima e <code className="bg-muted px-1 rounded">SEU_ANON_KEY</code> pela chave pública do projeto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}