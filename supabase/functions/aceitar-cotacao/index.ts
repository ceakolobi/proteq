// Edge function: marca cotação como aceita via token público + cria vistoria + envia link
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface Body {
  token?: string;
  cotacao_id?: string; // alternativa interna (CRM)
  internal?: boolean; // se true, não envia mensagens ao cliente
  origem_ip?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Body = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Buscar cotação pelo token público OU id interno
    let query = supabase.from("cotacoes").select("*");
    if (body.token) {
      query = query.eq("aceite_token", body.token);
    } else if (body.cotacao_id) {
      query = query.eq("id", body.cotacao_id);
    } else {
      return new Response(
        JSON.stringify({ error: "Forneça token ou cotacao_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: cotacao, error: errFetch } = await query.maybeSingle();
    if (errFetch || !cotacao) {
      return new Response(JSON.stringify({ error: "Cotação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Validar expiração (somente para fluxo público com token)
    if (body.token) {
      if (cotacao.aceite_expires_at && new Date(cotacao.aceite_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Link expirado" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3) Idempotência: se já aceita, retorna o estado atual
    const jaAceita = cotacao.status === "aceita" || !!cotacao.aceita_em;

    let vistoriaToken: string | null = null;
    let vistoriaPublicUrl: string | null = null;

    if (!jaAceita) {
      // 4) Marcar cotação como aceita
      const ip =
        body.origem_ip ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;

      const { error: errUpd } = await supabase
        .from("cotacoes")
        .update({
          status: "aceita",
          aceita_em: new Date().toISOString(),
          aceita_ip: ip,
        })
        .eq("id", cotacao.id);

      if (errUpd) throw errUpd;
    }

    // 5) Criar vistoria se houver veiculo_id e ainda não existir uma para esta cotação
    if (cotacao.veiculo_id) {
      const { data: vistExistente } = await supabase
        .from("vistorias")
        .select("id, token_acesso")
        .eq("cotacao_id", cotacao.id)
        .maybeSingle();

      if (vistExistente) {
        vistoriaToken = vistExistente.token_acesso;
      } else {
        const { data: novaVist, error: errVist } = await supabase
          .from("vistorias")
          .insert({
            veiculo_id: cotacao.veiculo_id,
            cotacao_id: cotacao.id,
            associado_id: cotacao.associado_id,
            consultor_id: cotacao.consultor_id,
            company_id: cotacao.company_id,
            tipo_vistoria: "pre_adesao",
            status: "pendente",
            canal_abertura: body.internal ? "crm" : "publico",
          })
          .select("id, token_acesso")
          .single();

        if (errVist) {
          console.error("Erro ao criar vistoria:", errVist);
        } else {
          vistoriaToken = novaVist.token_acesso;
        }
      }

      if (vistoriaToken) {
        const origin = req.headers.get("origin") || "";
        vistoriaPublicUrl = `${origin}/vistoria-publica?token=${vistoriaToken}`;
      }
    }

    // 6) Enviar e-mail ao cliente (se público) com link da vistoria
    if (!body.internal && cotacao.cliente_email && RESEND_API_KEY) {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
            <h2 style="color:#F97316">Cotação aceita com sucesso! 🎉</h2>
            <p>Olá ${cotacao.cliente_nome || ""},</p>
            <p>Recebemos seu aceite da proposta para o veículo <strong>${cotacao.marca} ${cotacao.modelo}</strong>.</p>
            ${vistoriaPublicUrl ? `
              <p>O próximo passo é a <strong>vistoria do veículo</strong>. Você pode realizar agora mesmo, pelo celular:</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${vistoriaPublicUrl}" style="background:#F97316;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Iniciar vistoria online</a>
              </p>
              <p style="font-size:12px;color:#6b7280">Ou copie o link: ${vistoriaPublicUrl}</p>
            ` : `
              <p>Em breve nossa equipe entrará em contato para agendar a vistoria.</p>
            `}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="font-size:12px;color:#6b7280">Esta é uma mensagem automática.</p>
          </div>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Harmony <onboarding@resend.dev>",
            to: [cotacao.cliente_email],
            subject: "✅ Sua cotação foi aceita — próximo passo: vistoria",
            html,
          }),
        });
      } catch (e) {
        console.error("Erro ao enviar e-mail:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        already_accepted: jaAceita,
        cotacao_id: cotacao.id,
        vistoria_token: vistoriaToken,
        vistoria_url: vistoriaPublicUrl,
        cliente_whatsapp: cotacao.cliente_whatsapp,
        cliente_nome: cotacao.cliente_nome,
        modelo: `${cotacao.marca} ${cotacao.modelo}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("aceitar-cotacao error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
