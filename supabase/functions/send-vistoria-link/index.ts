import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVistoriaLinkRequest {
  token: string;
  nome: string;
  celular: string;
  email: string;
  placa: string;
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
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, nome, celular, email, placa }: SendVistoriaLinkRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const link = `https://harmonyclube.com.br/vistoria/${token}`;
    const results: { email?: boolean; whatsapp?: boolean; error_email?: string; error_whatsapp?: string } = {};

    // ── Email via Resend ──────────────────────────────────────────────────────
    if (resendApiKey && email) {
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "Harmony Agro <noreply@harmonyclube.com.br>",
        to: [email],
        subject: `Realize sua vistoria — ${placa}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb">
            <div style="background:#F97316;padding:28px 24px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Harmony Agro</h1>
              <p style="color:#fff;margin:6px 0 0;font-size:13px;opacity:.9">Proteção Veicular para o Agronegócio</p>
            </div>
            <div style="padding:32px 24px;background:#fff">
              <h2 style="color:#1e3a5f;margin-top:0;font-size:20px">Olá, ${nome}!</h2>
              <p style="color:#374151;line-height:1.6">
                Seu link de vistoria para o veículo de placa <strong>${placa}</strong> foi gerado com sucesso.
              </p>
              <p style="color:#374151;line-height:1.6">
                Acesse o link abaixo, tire as fotos do seu veículo e envie. O link é válido por <strong>48 horas</strong>.
              </p>

              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:24px 0">
                <p style="margin:0 0 8px;font-weight:700;color:#ea580c;font-size:13px">FOTOS NECESSÁRIAS:</p>
                <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.8">
                  <li>Frente do veículo</li>
                  <li>Traseira do veículo</li>
                  <li>Lateral esquerda</li>
                  <li>Lateral direita</li>
                  <li>Painel / Hodômetro</li>
                  <li>Número do Chassi</li>
                  <li>CRLV (documento do veículo)</li>
                </ul>
              </div>

              <div style="text-align:center;margin:32px 0">
                <a href="${link}"
                   style="background:#F97316;color:#fff;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
                  Realizar Vistoria
                </a>
              </div>

              <p style="color:#9ca3af;font-size:12px;text-align:center">
                Ou copie: <a href="${link}" style="color:#F97316">${link}</a>
              </p>
            </div>
            <div style="padding:16px 24px;text-align:center;background:#f9fafb">
              <p style="color:#9ca3af;font-size:11px;margin:0">© ${new Date().getFullYear()} Harmony Agro — Todos os direitos reservados</p>
            </div>
          </div>
        `,
      });
      results.email = !emailError;
      if (emailError) results.error_email = emailError.message;
    }

    // ── WhatsApp via Evolution API ────────────────────────────────────────────
    if (evolutionApiUrl && evolutionApiKey && evolutionInstance && celular) {
      const phone = celular.replace(/\D/g, "");
      const phoneWithCode = phone.startsWith("55") ? phone : `55${phone}`;

      const message =
        `Olá ${nome}! 👋\n\n` +
        `Segue o link para realizar a vistoria do seu veículo *${placa}* ` +
        `(válido por 48h):\n\n${link}\n\n` +
        `Tire as fotos: frente, traseira, laterais, painel, chassi e CRLV.\n\n` +
        `_Harmony Agro — Proteção Veicular_ 🌾`;

      try {
        const waRes = await fetch(
          `${evolutionApiUrl}/message/sendText/${evolutionInstance}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionApiKey,
            },
            body: JSON.stringify({ number: phoneWithCode, text: message }),
          }
        );
        results.whatsapp = waRes.ok;
        if (!waRes.ok) results.error_whatsapp = await waRes.text();
      } catch (e: any) {
        results.whatsapp = false;
        results.error_whatsapp = e.message;
      }
    }

    const algumEnviou = results.email === true || results.whatsapp === true;
    return new Response(JSON.stringify({ success: algumEnviou, results }), {
      status: algumEnviou ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
