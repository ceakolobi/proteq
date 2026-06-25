// emily-contratar — Contratação autônoma via Emily Chat
// Executa: lead → associado → veículo → cotação → vistoria → auth → WhatsApp
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NUMERO_SANDRO = "47996362162";

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

interface DadosPessoais {
  nome_completo: string;
  cpf: string;           // apenas números
  data_nascimento: string; // dd/mm/aaaa
  telefone: string;      // apenas números, com DDD
  email: string;
  cidade: string;
  estado: string;
}

interface DadosVeiculo {
  tipo: string;
  placa: string;
  valor_fipe: number;
  cota_id: string;
  cota_nome: string;
  mensalidade: number;
  participacao: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Converte dd/mm/aaaa → YYYY-MM-DD para inserção no banco */
function parseDateBR(d: string): string {
  const n = d.replace(/\D/g, "");
  if (n.length !== 8) return d;
  return `${n.slice(4)}-${n.slice(2, 4)}-${n.slice(0, 2)}`;
}

/** Formata número de telefone sem máscara para exibição */
function formatPhone(t: string): string {
  const d = t.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/** Formata CPF para exibição */
function formatCPF(c: string): string {
  const d = c.replace(/\D/g, "");
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/** Formata valor monetário */
function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Adiciona 55 no início se necessário */
function phoneWithCode(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}

/** Envia mensagem WhatsApp via Evolution API */
async function sendWhatsApp(
  number: string,
  text: string,
  env: { url: string; key: string; instance: string }
): Promise<void> {
  try {
    await fetch(`${env.url}/message/sendText/${env.instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.key },
      body: JSON.stringify({ number: phoneWithCode(number), text }),
    });
  } catch (e) {
    console.error(`[emily-contratar] WhatsApp send error to ${number}:`, e);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // IDs criados — usados para rollback em caso de erro
  const created = {
    lead_id: null as string | null,
    associado_id: null as string | null,
    veiculo_id: null as string | null,
    cotacao_id: null as string | null,
    vistoria_id: null as string | null,
    auth_user_id: null as string | null,
  };

  const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVO_URL         = Deno.env.get("EVOLUTION_API_URL") ?? "";
  const EVO_KEY         = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const EVO_INSTANCE    = Deno.env.get("EVOLUTION_INSTANCE") ?? "";
  const SITE_URL        = Deno.env.get("SITE_URL") ?? "https://harmonyclube.com.br";

  const hasEvolution = !!(EVO_URL && EVO_KEY && EVO_INSTANCE);
  const evo = { url: EVO_URL, key: EVO_KEY, instance: EVO_INSTANCE };

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json() as { dadosPessoais: DadosPessoais; dadosVeiculo: DadosVeiculo };
    const { dadosPessoais: p, dadosVeiculo: v } = body;

    if (!p?.cpf || !p?.email || !v?.placa) {
      return jsonResp({ success: false, mensagem: "Dados incompletos." }, 400);
    }

    const cpfLimpo = p.cpf.replace(/\D/g, "");
    const telLimpo = p.telefone.replace(/\D/g, "");
    const dataNasc = parseDateBR(p.data_nascimento);

    // ── 1. Verificar CPF duplicado ──────────────────────────────────────────
    const { data: cpfExistente } = await db
      .from("associados")
      .select("id, status")
      .eq("cpf", cpfLimpo)
      .maybeSingle();

    if (cpfExistente) {
      return jsonResp({
        success: false,
        cpf_ja_existe: true,
        mensagem: `Já temos um cadastro com este CPF. Status: ${cpfExistente.status}. Faça login em harmonyclube.com.br para acessar sua área.`,
      });
    }

    // ── 2. Buscar consultor padrão ──────────────────────────────────────────
    const { data: consultores } = await db.rpc("get_default_consultor_publico");
    const consultor = (consultores as { id: string; company_id: string | null }[] | null)?.[0];
    if (!consultor) {
      return jsonResp({ success: false, mensagem: "Consultor padrão não encontrado. Contate o suporte." }, 500);
    }
    const consultorId  = consultor.id;
    const companyId    = consultor.company_id;

    // ── 3. Criar lead ───────────────────────────────────────────────────────
    const { data: novoLead, error: leadErr } = await db
      .from("leads")
      .insert({
        nome: p.nome_completo,
        telefone: telLimpo,
        email: p.email.toLowerCase().trim(),
        consultor_id: consultorId,
        company_id: companyId,
        origem: "emily_chat",
        status: "convertido",
        tipo_veiculo: v.tipo,
      })
      .select("id")
      .single();

    if (leadErr || !novoLead) throw new Error(`Erro ao criar lead: ${leadErr?.message}`);
    created.lead_id = novoLead.id;

    // ── 4. Criar associado ──────────────────────────────────────────────────
    const { data: novoAssociado, error: assocErr } = await db
      .from("associados")
      .insert({
        nome_completo: p.nome_completo.trim(),
        cpf: cpfLimpo,
        data_nascimento: dataNasc,
        telefone: telLimpo,
        email: p.email.toLowerCase().trim(),
        cidade: p.cidade.trim(),
        estado: p.estado.toUpperCase().trim(),
        consultor_id: consultorId,
        company_id: companyId,
        status: "ativo",
        termos_aceitos: true,
        termos_aceitos_em: new Date().toISOString(),
        dia_vencimento: 10,
      })
      .select("id")
      .single();

    if (assocErr || !novoAssociado) throw new Error(`Erro ao criar associado: ${assocErr?.message}`);
    created.associado_id = novoAssociado.id;

    // ── 5. Criar veículo ────────────────────────────────────────────────────
    const { data: novoVeiculo, error: veicErr } = await db
      .from("veiculos")
      .insert({
        associado_id: novoAssociado.id,
        tipo: v.tipo,
        placa: v.placa.toUpperCase(),
        valor_fipe: v.valor_fipe,
        cota_id: v.cota_id,
        mensalidade: v.mensalidade,
        veiculo_status: "aguardando_vistoria",
        consultor_id: consultorId,
        company_id: companyId,
        sede_id: null,
        lead_id: novoLead.id,
      })
      .select("id")
      .single();

    if (veicErr || !novoVeiculo) throw new Error(`Erro ao criar veículo: ${veicErr?.message}`);
    created.veiculo_id = novoVeiculo.id;

    // ── 6. Criar cotação ────────────────────────────────────────────────────
    const { data: novaCotacao, error: cotErr } = await db
      .from("cotacoes")
      .insert({
        lead_id: novoLead.id,
        consultor_id: consultorId,
        associado_id: novoAssociado.id,
        veiculo_id: novoVeiculo.id,
        status: "aprovado",
        tipo_bem: v.tipo,
        placa: v.placa.toUpperCase(),
        metodo_valoracao: "fipe",
        valor_bem: v.valor_fipe,
        valor_fipe: v.valor_fipe,
        cota_id: v.cota_id,
        mensalidade: v.mensalidade,
        participacao: v.participacao,
        carro_reserva_dias: 15,
        carro_reserva_adicional: 0,
      })
      .select("id")
      .single();

    if (cotErr || !novaCotacao) throw new Error(`Erro ao criar cotação: ${cotErr?.message}`);
    created.cotacao_id = novaCotacao.id;

    // ── 7. Criar vistoria com token ─────────────────────────────────────────
    const vistoriaToken = crypto.randomUUID();
    const tokenExpires  = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: novaVistoria, error: vistErr } = await db
      .from("vistorias")
      .insert({
        veiculo_id: novoVeiculo.id,
        associado_id: novoAssociado.id,
        cotacao_id: novaCotacao.id,
        status: "pendente",
        tipo_vistoria: "pre_adesao",
        token_assinatura: vistoriaToken,
        token_assinatura_expires_at: tokenExpires,
        consultor_id: consultorId,
      })
      .select("id")
      .single();

    if (vistErr || !novaVistoria) throw new Error(`Erro ao criar vistoria: ${vistErr?.message}`);
    created.vistoria_id = novaVistoria.id;

    // ── 8. Criar usuário no Supabase Auth ───────────────────────────────────
    const senhaTemp = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Hx1!";
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email: p.email.toLowerCase().trim(),
      password: senhaTemp,
      email_confirm: true,
      user_metadata: {
        nome_completo: p.nome_completo,
        associado_id: novoAssociado.id,
      },
    });

    if (authErr || !authData.user) throw new Error(`Erro ao criar usuário: ${authErr?.message}`);
    created.auth_user_id = authData.user.id;

    // ── 9. Inserir role associado ───────────────────────────────────────────
    await db.from("user_roles").insert({ user_id: authData.user.id, role: "associado" });

    // Vincular user_id ao associado
    await db.from("associados").update({ user_id: authData.user.id }).eq("id", novoAssociado.id);

    // ── 10. Gerar magic link ────────────────────────────────────────────────
    let magicLink = `${SITE_URL}/dashboard`;
    try {
      const { data: linkData } = await db.auth.admin.generateLink({
        type: "magiclink",
        email: p.email.toLowerCase().trim(),
        options: { redirectTo: `${SITE_URL}/dashboard` },
      });
      if ((linkData as any)?.properties?.action_link) {
        magicLink = (linkData as any).properties.action_link;
      }
    } catch (e) {
      console.error("[emily-contratar] Erro ao gerar magic link:", e);
    }

    // ── 11–13. WhatsApp ─────────────────────────────────────────────────────
    if (hasEvolution) {
      const agora = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      // Mensagem para o NOVO ASSOCIADO
      const msgAssociado =
        `Olá ${p.nome_completo.split(" ")[0]}! 🎉\n` +
        `Bem-vindo(a) à Harmony — sua proteção veicular já está em andamento!\n\n` +
        `🚗 Veículo: ${v.placa} — ${v.tipo}\n` +
        `💰 Mensalidade: ${fmtBRL(v.mensalidade)}/mês\n` +
        `📋 Plano: ${v.cota_nome}\n\n` +
        `Para acessar sua área do associado, clique no link abaixo:\n` +
        `${magicLink}\n\n` +
        `Em breve nossa equipe entrará em contato para agendar a vistoria do seu veículo.\n` +
        `Qualquer dúvida, é só falar comigo aqui! 😊\n\n` +
        `— Emily | Harmony Proteção Veicular`;

      await sendWhatsApp(telLimpo, msgAssociado, evo);

      // Mensagem para o GESTOR (Sandro)
      const msgGestor =
        `🎉 Nova contratação pela Emily!\n` +
        `👤 Associado: ${p.nome_completo}\n` +
        `📄 CPF: ${formatCPF(cpfLimpo)}\n` +
        `📱 WhatsApp: ${formatPhone(telLimpo)}\n` +
        `📧 Email: ${p.email}\n` +
        `🚗 Veículo: ${v.placa} — ${v.tipo}\n` +
        `💰 Mensalidade: ${fmtBRL(v.mensalidade)}/mês\n` +
        `📋 Plano: ${v.cota_nome}\n` +
        `💎 FIPE: ${fmtBRL(v.valor_fipe)}\n` +
        `📍 Cidade: ${p.cidade}/${p.estado}\n` +
        `⏰ Contratado em: ${agora}\n` +
        `✅ Vistoria pendente — cliente notificado automaticamente.`;

      await sendWhatsApp(NUMERO_SANDRO, msgGestor, evo);

      // Mensagem para REGIONAL/SEDE
      const msgRegional =
        `📊 Resumo de nova adesão — Harmony\n` +
        `Novo associado cadastrado via Emily Chat:\n\n` +
        `${p.nome_completo} — ${p.cidade}/${p.estado}\n` +
        `Veículo: ${v.placa} (${v.tipo}) — FIPE ${fmtBRL(v.valor_fipe)}\n` +
        `Plano: ${v.cota_nome} — ${fmtBRL(v.mensalidade)}/mês\n` +
        `Status vistoria: Pendente\n\n` +
        `ID Associado: ${novoAssociado.id}`;

      await sendWhatsApp(NUMERO_SANDRO, msgRegional, evo);

      // ── 14. Enviar link de vistoria ───────────────────────────────────────
      const vistoriaLink = `${SITE_URL}/vistoria/${vistoriaToken}`;
      const msgVistoria =
        `Olá ${p.nome_completo.split(" ")[0]}! 👋\n\n` +
        `Para ativar sua proteção veicular, precisamos fazer a vistoria do seu ${v.tipo} (${v.placa}).\n\n` +
        `Acesse o link abaixo e tire as fotos do veículo (válido por 48h):\n` +
        `${vistoriaLink}\n\n` +
        `Fotos necessárias: frente, traseira, laterais, painel, chassi e CRLV.\n\n` +
        `_Harmony Proteção Veicular_ 🌾`;

      await sendWhatsApp(telLimpo, msgVistoria, evo);
    }

    // ── 15. Retornar sucesso ────────────────────────────────────────────────
    return jsonResp({
      success: true,
      associado_id: novoAssociado.id,
      vistoria_token: vistoriaToken,
      mensagem: `Contratação concluída! Bem-vindo(a), ${p.nome_completo.split(" ")[0]}!`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[emily-contratar] ERRO:", msg, "| Rollback:", JSON.stringify(created));

    // ── Rollback em ordem reversa ───────────────────────────────────────────
    try {
      if (created.auth_user_id) {
        await db.from("user_roles").delete().eq("user_id", created.auth_user_id);
        await db.auth.admin.deleteUser(created.auth_user_id);
      }
      if (created.vistoria_id) await db.from("vistorias").delete().eq("id", created.vistoria_id);
      if (created.cotacao_id)  await db.from("cotacoes").delete().eq("id", created.cotacao_id);
      if (created.veiculo_id)  await db.from("veiculos").delete().eq("id", created.veiculo_id);
      if (created.associado_id) await db.from("associados").delete().eq("id", created.associado_id);
      if (created.lead_id)     await db.from("leads").delete().eq("id", created.lead_id);
    } catch (rbErr) {
      console.error("[emily-contratar] Rollback parcialmente falhou:", rbErr);
    }

    // Notificar Sandro via WhatsApp sobre erro
    const hasEvolution = !!(EVO_URL && EVO_KEY && EVO_INSTANCE);
    if (hasEvolution) {
      await sendWhatsApp(
        NUMERO_SANDRO,
        `⚠️ Erro na contratação via Emily!\nCliente: ${req.headers.get("x-client-name") ?? "desconhecido"}\nErro: ${msg}\nVerifique os logs da edge function.`,
        { url: EVO_URL, key: EVO_KEY, instance: EVO_INSTANCE }
      );
    }

    return jsonResp({
      success: false,
      mensagem: "Tive um problema técnico ao finalizar. Nossa equipe já foi notificada e vai entrar em contato!",
      erro_interno: msg,
    }, 500);
  }
});
