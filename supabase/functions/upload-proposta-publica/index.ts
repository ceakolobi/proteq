import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizeFilename = (filename: string) => {
  const cleaned = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned || "proposta"}.pdf`;
};

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, pdfBase64 } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "PDF não informado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do backend incompleta.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const safeFilename = sanitizeFilename(String(filename || "proposta.pdf"));
    const path = `publicas/${crypto.randomUUID()}-${safeFilename}`;
    const bytes = base64ToBytes(pdfBase64);

    if (bytes.byteLength > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "PDF muito grande para envio." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.storage.from("propostas").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("propostas").getPublicUrl(path);

    return new Response(JSON.stringify({ publicUrl: data.publicUrl, path }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao publicar proposta:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao publicar proposta." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});