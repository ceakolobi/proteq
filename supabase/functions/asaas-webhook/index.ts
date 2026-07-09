import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Endpoint PÚBLICO — a Asaas chama de fora. Validação via token no header.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, asaas-access-token",
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Validar origem: a Asaas envia o token configurado no header asaas-access-token
  const receivedToken = req.headers.get("asaas-access-token");
  if (!webhookToken || receivedToken !== webhookToken) {
    console.error("[asaas-webhook] token inválido ou ausente");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event: string = payload?.event ?? "UNKNOWN";
  const payment = payload?.payment ?? null;

  // 2) Log de TODOS os eventos (tratados ou não) para debugging
  console.log(`[asaas-webhook] evento=${event} paymentId=${payment?.id ?? "-"} status=${payment?.status ?? "-"} customer=${payment?.customer ?? "-"}`);

  // Resposta padrão de sucesso — a Asaas re-tenta se não receber 200.
  const done = (extra: object = {}) =>
    new Response(JSON.stringify({ received: true, event, ...extra }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!payment?.id) return done({ note: "sem objeto payment" });

  try {
    // Localiza o associado pelo customer da Asaas
    const { data: assoc } = await admin
      .from("associados")
      .select("id, company_id")
      .eq("asaas_customer_id", payment.customer)
      .maybeSingle();

    // Localiza cobrança existente por asaas_payment_id
    const { data: cobrancaExistente } = await admin
      .from("cobrancas")
      .select("id, mensalidade_id")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    switch (event) {
      case "PAYMENT_CREATED": {
        // Cria a cobrança local (se ainda não existir), espelhando os dados da Asaas
        if (!cobrancaExistente && assoc) {
          const { error } = await admin.from("cobrancas").insert({
            associado_id: assoc.id,
            company_id: assoc.company_id ?? null,
            valor: Number(payment.value),
            data_vencimento: payment.dueDate,
            status: "pendente",
            tipo: payment.billingType ?? "asaas",
            link_pagamento: payment.invoiceUrl ?? null,
            codigo_pix: payment.pixQrCode ?? null,
            codigo_barras: payment.bankSlipUrl ?? null,
            asaas_payment_id: payment.id,
            asaas_status: payment.status ?? "PENDING",
          });
          if (error) console.error("[asaas-webhook] erro insert cobranca:", error.message);
        }
        return done({ action: "cobranca_criada" });
      }

      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        if (cobrancaExistente) {
          await admin.from("cobrancas").update({
            status: "pago",
            asaas_status: payment.status,
            data_pagamento: payment.paymentDate ?? hoje(),
          }).eq("id", cobrancaExistente.id);

          // Espelha a baixa na mensalidade vinculada, se houver
          if (cobrancaExistente.mensalidade_id) {
            await admin.from("mensalidades").update({
              status: "pago",
              data_pagamento: payment.paymentDate ?? hoje(),
              forma_pagamento: payment.billingType ?? "asaas",
            }).eq("id", cobrancaExistente.mensalidade_id);
          }
        }
        return done({ action: "pagamento_confirmado" });
      }

      case "PAYMENT_OVERDUE": {
        if (cobrancaExistente) {
          await admin.from("cobrancas").update({
            status: "vencido",
            asaas_status: payment.status,
          }).eq("id", cobrancaExistente.id);
        }
        return done({ action: "marcado_vencido" });
      }

      default:
        // Evento não tratado — já foi logado acima
        return done({ action: "ignorado" });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erro";
    console.error("[asaas-webhook] erro processando:", msg);
    // Retorna 200 mesmo assim para evitar retry infinito; erro fica no log
    return done({ error: msg });
  }
});
