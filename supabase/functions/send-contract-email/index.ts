import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendContractEmailRequest {
  associado_id: string;
  contrato_url: string;
  email: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Resend não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { associado_id, contrato_url, email }: SendContractEmailRequest = await req.json();

    if (!associado_id || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch associado name
    const { data: associado } = await supabase
      .from("associados")
      .select("nome_completo")
      .eq("id", associado_id)
      .single();

    const nomeAssociado = associado?.nome_completo ?? "Associado";

    const resend = new Resend(resendApiKey);

    // If contrato_url is a storage path (not a full URL), generate signed URL
    let downloadUrl = contrato_url;
    if (contrato_url && !contrato_url.startsWith("http")) {
      const { data } = await supabase.storage
        .from("termos-aceite")
        .createSignedUrl(contrato_url, 7 * 24 * 3600); // 7 days
      if (data?.signedUrl) downloadUrl = data.signedUrl;
    }

    const { error: emailError } = await resend.emails.send({
      from: "Harmony Agro <noreply@harmonyclube.com.br>",
      to: [email],
      subject: "Seu contrato — Harmony Agro",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb">
          <div style="background:#F97316;padding:28px 24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Harmony Agro</h1>
            <p style="color:#fff;margin:6px 0 0;font-size:13px;opacity:.9">Proteção Veicular para o Agronegócio</p>
          </div>
          <div style="padding:32px 24px;background:#fff">
            <h2 style="color:#1e3a5f;margin-top:0">Olá, ${nomeAssociado}!</h2>
            <p style="color:#374151;line-height:1.6">
              Segue o link para acessar seu contrato de proteção veicular.
            </p>
            <div style="text-align:center;margin:32px 0">
              <a href="${downloadUrl}"
                 style="background:#F97316;color:#fff;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
                Visualizar Contrato
              </a>
            </div>
            <p style="color:#9ca3af;font-size:12px;text-align:center">
              Ou copie: <a href="${downloadUrl}" style="color:#F97316">${downloadUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#6b7280;font-size:13px">
              Em caso de dúvidas, entre em contato com seu consultor.
            </p>
          </div>
          <div style="padding:16px 24px;text-align:center;background:#f9fafb">
            <p style="color:#9ca3af;font-size:11px;margin:0">
              © ${new Date().getFullYear()} Harmony Agro — Todos os direitos reservados
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
