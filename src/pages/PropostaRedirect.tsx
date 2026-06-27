import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PropostaRedirect() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("cotacoes")
      .select("pdf_url")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data?.pdf_url) {
          window.location.href = data.pdf_url;
        }
      });
  }, [id]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando para a proposta...</p>
    </div>
  );
}
