import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sempre 200 com { success, error } — não engolir erro silenciosamente.
function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Calcula a próxima data (YYYY-MM-DD) com o dia de vencimento informado, a partir de hoje.
function proximoVencimento(diaVenc: number): string {
  const hoje = new Date();
  const dia = Math.min(Math.max(diaVenc || 10, 1), 28); // limita a 28 p/ evitar meses curtos
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth(); // 0-based
  // Se o dia deste mês já passou, joga para o próximo mês
  if (hoje.getDate() >= dia) {
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  const mm = String(mes + 1).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    // Base configurável: default PRODUÇÃO. Aponte para sandbox setando ASAAS_BASE_URL.
    const asaasBase = (Deno.env.get("ASAAS_BASE_URL") ?? "https://api.asaas.com/v3").replace(/\/$/, "");
    // Forma de cobrança: UNDEFINED deixa o pagador escolher (boleto/pix). Ajuste se quiser fixar.
    const billingType = Deno.env.get("ASAAS_BILLING_TYPE") ?? "UNDEFINED";

    if (!asaasApiKey) return ok({ success: false, error: "ASAAS_API_KEY não configurada nos secrets" });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Autenticação: só admin_principal pode disparar (dinheiro real)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ success: false, error: "Não autorizado" });
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !caller) return ok({ success: false, error: "Token inválido" });

    const { data: callerProfile } = await admin
      .from("profiles").select("is_admin_principal").eq("id", caller.id).single();
    if (callerProfile?.is_admin_principal !== true) {
      return ok({ success: false, error: "Apenas o Admin Principal pode ativar cobrança" });
    }

    // 2) Body
    const { associadoId } = await req.json();
    if (!associadoId) return ok({ success: false, error: "associadoId é obrigatório" });

    // 3) Dados do associado
    const { data: assoc, error: assocErr } = await admin
      .from("associados")
      .select("id, nome_completo, cpf, email, telefone, dia_vencimento, company_id, asaas_customer_id")
      .eq("id", associadoId)
      .single();
    if (assocErr || !assoc) return ok({ success: false, error: "Associado não encontrado" });
    if (!assoc.cpf) return ok({ success: false, error: "Associado sem CPF — obrigatório para a Asaas" });

    // 4) Veículo mais recente + valor da mensalidade
    const { data: veiculo, error: veicErr } = await admin
      .from("veiculos")
      .select("id, mensalidade, asaas_subscription_id")
      .eq("associado_id", associadoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (veicErr) return ok({ success: false, error: `Erro ao buscar veículo: ${veicErr.message}` });
    if (!veiculo) return ok({ success: false, error: "Associado sem veículo cadastrado" });
    if (!veiculo.mensalidade || veiculo.mensalidade <= 0) {
      return ok({ success: false, error: "Veículo sem valor de mensalidade definido" });
    }

    // Já tem assinatura? Não duplicar cobrança real.
    if (veiculo.asaas_subscription_id) {
      return ok({
        success: true,
        alreadyActive: true,
        message: "Este veículo já possui assinatura Asaas ativa.",
        subscriptionId: veiculo.asaas_subscription_id,
        customerId: assoc.asaas_customer_id,
      });
    }

    // 5) Dia de vencimento (fallback em configuracoes_financeiras)
    let diaVenc = assoc.dia_vencimento as number | null;
    if (!diaVenc) {
      const { data: cfg } = await admin
        .from("configuracoes_financeiras")
        .select("dia_vencimento_padrao")
        .limit(1)
        .maybeSingle();
      diaVenc = (cfg as any)?.dia_vencimento_padrao ?? 10;
    }

    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": asaasApiKey,
    };

    // 6) Criar (ou reutilizar) o customer na Asaas
    let customerId = assoc.asaas_customer_id as string | null;
    if (!customerId) {
      const custRes = await fetch(`${asaasBase}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: assoc.nome_completo,
          cpfCnpj: (assoc.cpf || "").replace(/\D/g, ""),
          email: assoc.email || undefined,
          mobilePhone: (assoc.telefone || "").replace(/\D/g, "") || undefined,
          externalReference: assoc.id,
        }),
      });
      const custJson = await custRes.json();
      if (!custRes.ok || !custJson.id) {
        console.error("[asaas-criar-assinatura] erro customer:", JSON.stringify(custJson));
        return ok({ success: false, error: `Erro ao criar cliente na Asaas: ${JSON.stringify(custJson.errors ?? custJson)}` });
      }
      customerId = custJson.id;
      const { error: upErr } = await admin
        .from("associados").update({ asaas_customer_id: customerId }).eq("id", assoc.id);
      if (upErr) console.error("[asaas-criar-assinatura] falha ao salvar customer_id:", upErr.message);
    }

    // 7) Criar a assinatura recorrente mensal
    const subRes = await fetch(`${asaasBase}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: Number(veiculo.mensalidade),
        nextDueDate: proximoVencimento(diaVenc),
        cycle: "MONTHLY",
        description: `Proteção veicular Harmony — ${assoc.nome_completo}`,
        externalReference: veiculo.id,
      }),
    });
    const subJson = await subRes.json();
    if (!subRes.ok || !subJson.id) {
      console.error("[asaas-criar-assinatura] erro subscription:", JSON.stringify(subJson));
      return ok({ success: false, error: `Erro ao criar assinatura na Asaas: ${JSON.stringify(subJson.errors ?? subJson)}` });
    }

    const { error: subUpErr } = await admin
      .from("veiculos").update({ asaas_subscription_id: subJson.id }).eq("id", veiculo.id);
    if (subUpErr) console.error("[asaas-criar-assinatura] falha ao salvar subscription_id:", subUpErr.message);

    return ok({
      success: true,
      customerId,
      subscriptionId: subJson.id,
      value: Number(veiculo.mensalidade),
      nextDueDate: proximoVencimento(diaVenc),
      message: "Cliente e assinatura criados na Asaas com sucesso.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[asaas-criar-assinatura] unhandled:", msg);
    return ok({ success: false, error: msg });
  }
});
