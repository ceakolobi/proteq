import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown } from "lucide-react";

type GeneratedContract = {
  id: string;
  status: string;
  generated_at: string;
  pdf_path: string | null;
};

function formatDateBR(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function MeusContratos() {
  const { user, roles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GeneratedContract[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Busca o associado_id vinculado ao usuário logado
        const { data: assocData } = await supabase
          .from("associados")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        let query = supabase
          .from("generated_contracts")
          .select("id, status, generated_at, pdf_path")
          .order("generated_at", { ascending: false })
          .limit(50);

        // Se for associado, filtra pelos próprios contratos
        if ((assocData as any)?.id) {
          query = query.eq("associado_id", (assocData as any).id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setItems((data as any) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const download = async (c: GeneratedContract) => {
    if (!c.pdf_path) return;
    const { data, error } = await supabase
      .storage
      .from("termos-aceite")
      .createSignedUrl(c.pdf_path, 60);
    if (error) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Meus Contratos</h1>
          <p className="text-muted-foreground">Visualize e baixe os contratos gerados para seu perfil.</p>
        </header>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Sessão expirada</CardTitle>
              <CardDescription>Faça login novamente.</CardDescription>
            </CardHeader>
          </Card>
        ) : roles.includes("associado") && items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum contrato encontrado</CardTitle>
              <CardDescription>Quando um pagamento for confirmado, um contrato pode ser gerado automaticamente.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Contrato</span>
                      <Badge variant="secondary">{c.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Gerado em {formatDateBR(c.generated_at)}</p>
                  </div>
                  <Button variant="outline" onClick={() => download(c)} disabled={!c.pdf_path}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
