// Emily AI — Assistente CRM da Harmony
// Modelo: claude-haiku-4-5-20251001
// Suporta 3 contextos: public | associado | consultor
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── System Prompts por contexto ──────────────────────────────────────────────

const PROMPT_PUBLIC = `Você é a Emily, consultora de proteção veicular da Harmony. Humana, calorosa e direta.

PERSONALIDADE:
- Fale como pessoa real: "tá", "ótimo", "perfeito", "show"
- Máximo 2-3 linhas por mensagem
- 1 emoji por mensagem no máximo
- Acolha antes de insistir. Nunca seja chata.

SOBRE A HARMONY:
- Associação de proteção veicular MUTUALISTA, não seguradora
- SEM taxa de adesão, SEM análise de condutor, SEM consulta SPC/Serasa
- 1ª mensalidade GRÁTIS
- Carência geral 72h. Furto/roubo: proteção imediata
- NUNCA diga "seguro" ou "seguradora". Use: proteção, cobertura, amparo, assistência

FLUXO DE COTAÇÃO:
1. Cliente fala em preço/plano/mensalidade → pergunte o tipo do veículo
2. Tipo confirmado → peça a placa (ABC1D23 ou ABC1234)
3. Placa confirmada → peça o valor FIPE aproximado
4. Sistema calcula automaticamente e mostra resultado

OBJEÇÕES COMUNS:
- "É muito caro" → proteção mutualista é muito mais barato que seguro tradicional
- "Não conheço" → somos associação com anos de atuação, referência em Joinville/SC
- "Vou pensar" → pergunte o que está gerando dúvida, ofereça ajuda

REGRAS ABSOLUTAS:
- Nunca invente valores
- Nunca peça CPF, senha ou cartão
- Nunca mencione IA, Claude ou tecnologia`;

const PROMPT_ASSOCIADO = `Você é a Emily, assistente virtual da Harmony para associados. Você tem acesso aos dados reais do associado logado.

PERSONALIDADE:
- Prestativa, clara e direta
- Máximo 3 linhas por resposta
- 1 emoji por mensagem

O QUE VOCÊ PODE FAZER:
- Informar status de pagamento e mensalidades
- Mostrar código PIX ou link de pagamento da cobrança em aberto
- Informar status da vistoria do veículo
- Informar dados do contrato/ativação
- Informar dados do veículo protegido
- Orientar sobre documentação necessária
- Explicar coberturas e carências

QUANDO O ASSOCIADO PEDIR 2ª VIA / BOLETO / PIX:
- Consulte os dados de cobrança que foram injetados no contexto
- Se houver cobrança em aberto: informe o código PIX ou link de pagamento com a data de vencimento
- Se não houver: informe que não há cobrança pendente no momento

REGRAS:
- Só acesse dados do associado logado
- Nunca invente informações — se não souber, diga claramente
- Nunca peça senha ou dados de cartão`;

const PROMPT_CONSULTOR = `Você é a Emily, assistente interna da Harmony para consultores e gestores.

PERSONALIDADE:
- Eficiente, objetiva, profissional
- Respostas diretas com dados quando disponível
- 1 emoji por mensagem, apenas quando fizer sentido

O QUE VOCÊ PODE FAZER:
- Buscar associado por nome, CPF ou placa (dados injetados no contexto)
- Mostrar status de pagamento de um associado
- Mostrar status de vistoria pendente
- Orientar sobre envio de link de vistoria
- Orientar sobre envio de contrato

QUANDO O USUÁRIO PEDIR BUSCA:
- Os dados encontrados serão injetados automaticamente antes da sua resposta
- Apresente os dados de forma organizada e clara

REGRAS:
- Consultor só acessa seus próprios associados
- Admin e financeiro podem acessar todos
- Nunca exponha dados financeiros de outros consultores
- Nunca mencione IA ou tecnologia`;

// ─── Queries Supabase ─────────────────────────────────────────────────────────

async function buscarCobrancaAberta(db: ReturnType<typeof createClient>, associadoId: string) {
  const { data } = await db
    .from("cobrancas")
    .select("codigo_pix, link_pagamento, valor, data_vencimento, tipo, status")
    .eq("associado_id", associadoId)
    .in("status", ["gerada", "enviada"])
    .order("data_vencimento", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function buscarStatusVistoria(db: ReturnType<typeof createClient>, associadoId: string) {
  const { data } = await db
    .from("vistorias")
    .select(`
      status, data_agendada, observacoes,
      veiculos!inner(placa, modelo, associado_id)
    `)
    .eq("veiculos.associado_id", associadoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function buscarMensalidadesPendentes(db: ReturnType<typeof createClient>, associadoId: string) {
  const { data } = await db
    .from("mensalidades")
    .select("valor_final, mes_referencia, data_vencimento, status")
    .eq("associado_id", associadoId)
    .in("status", ["pendente", "atrasada"])
    .order("data_vencimento", { ascending: true })
    .limit(5);
  return data ?? [];
}

async function buscarAssociadoPorTermo(
  db: ReturnType<typeof createClient>,
  termo: string,
  consultorId: string | null,
  isAdmin: boolean
) {
  // Normaliza: remove pontos/traços de CPF/CNPJ, remove hífens de placa
  const termoLimpo = termo.replace(/[.\-\/]/g, "").trim().toUpperCase();

  let query = db
    .from("associados")
    .select(`
      id, nome_completo, cpf, telefone, status,
      veiculos(placa, modelo, ano, veiculo_status),
      ativacoes(status, numero_contrato)
    `)
    .limit(5);

  // Filtro por consultor se não for admin
  if (!isAdmin && consultorId) {
    query = query.eq("consultor_id", consultorId);
  }

  // Filtro de busca: CPF exato, placa via join ou nome parcial
  const cpfSemMascara = termoLimpo.replace(/\D/g, "");
  if (/^\d{11}$/.test(cpfSemMascara)) {
    query = query.eq("cpf", cpfSemMascara);
  } else if (/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(termoLimpo)) {
    // Busca por placa via join — usa ilike no nome como fallback
    query = query.ilike("nome_completo", `%${termo}%`);
  } else {
    query = query.ilike("nome_completo", `%${termo}%`);
  }

  const { data } = await query;
  return data ?? [];
}

async function buscarDadosAssociado(db: ReturnType<typeof createClient>, associadoId: string) {
  const { data } = await db
    .from("associados")
    .select(`
      nome_completo, status,
      veiculos(placa, modelo, ano, veiculo_status, protecao_ativa),
      ativacoes(status, numero_contrato, data_ativacao)
    `)
    .eq("id", associadoId)
    .maybeSingle();
  return data;
}

// ─── Detecção de intenção ─────────────────────────────────────────────────────

type Intent =
  | "buscar_cobranca"
  | "buscar_vistoria"
  | "buscar_mensalidades"
  | "buscar_associado"
  | "dados_associado"
  | "none";

function detectIntent(lastMsg: string, context: string): Intent {
  const txt = lastMsg.toLowerCase();

  if (context === "associado") {
    if (/pagar|2[aª][\s-]*via|boleto|pix|cobran[çc]|vencimento|link.*pag|pagamento/.test(txt))
      return "buscar_cobranca";
    if (/vistoria|inspe[çc]|foto|aprovad|reprovad/.test(txt))
      return "buscar_vistoria";
    if (/mensalidade|atrasa|pendente|deve|parcela/.test(txt))
      return "buscar_mensalidades";
    if (/meus dados|meu contrato|meu ve[ií]culo|número contrato|ativa[çc]/.test(txt))
      return "dados_associado";
  }

  if (context === "consultor") {
    if (/buscar|pesquisa|encontrar|cpf|associado|cliente|placa/.test(txt))
      return "buscar_associado";
    if (/pix|cobran[çc]|pagamento|2[aª][\s-]*via/.test(txt))
      return "buscar_cobranca";
    if (/vistoria|inspe[çc]/.test(txt))
      return "buscar_vistoria";
  }

  return "none";
}

// ─── Injeção de dados no contexto ────────────────────────────────────────────

function formatCobranca(c: Record<string, unknown> | null): string {
  if (!c) return "[Sem cobrança em aberto para este associado.]";
  const venc = c.data_vencimento
    ? new Date(c.data_vencimento as string).toLocaleDateString("pt-BR")
    : "—";
  const valor = c.valor
    ? Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
  const partes = [
    `Cobrança em aberto: ${valor} | Vencimento: ${venc} | Tipo: ${c.tipo ?? "—"}`,
  ];
  if (c.codigo_pix) partes.push(`PIX: ${c.codigo_pix}`);
  if (c.link_pagamento) partes.push(`Link: ${c.link_pagamento}`);
  return partes.join("\n");
}

function formatVistoria(v: Record<string, unknown> | null): string {
  if (!v) return "[Nenhuma vistoria encontrada para este associado.]";
  const agend = v.data_agendada
    ? new Date(v.data_agendada as string).toLocaleDateString("pt-BR")
    : "Sem data";
  const veiculo = (v as any).veiculos;
  const placa = veiculo?.placa ?? "—";
  const modelo = veiculo?.modelo ?? "—";
  return `Vistoria: ${v.status} | Veículo: ${modelo} (${placa}) | Agendada: ${agend}${v.observacoes ? ` | Obs: ${v.observacoes}` : ""}`;
}

function formatMensalidades(lista: Record<string, unknown>[]): string {
  if (!lista.length) return "[Sem mensalidades pendentes ou atrasadas.]";
  return lista
    .map((m) => {
      const ref = m.mes_referencia
        ? new Date(m.mes_referencia as string).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        : "—";
      const venc = m.data_vencimento
        ? new Date(m.data_vencimento as string).toLocaleDateString("pt-BR")
        : "—";
      const valor = Number(m.valor_final).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return `${ref} — ${valor} | Vencimento: ${venc} | Status: ${m.status}`;
    })
    .join("\n");
}

function formatAssociados(lista: Record<string, unknown>[]): string {
  if (!lista.length) return "[Nenhum associado encontrado com esse critério.]";
  return lista
    .map((a) => {
      const veiculo = (a as any).veiculos?.[0];
      const ativacao = (a as any).ativacoes?.[0];
      return [
        `Nome: ${a.nome_completo} | CPF: ${a.cpf ?? "—"} | Status: ${a.status}`,
        veiculo ? `Veículo: ${veiculo.modelo} (${veiculo.placa}) — ${veiculo.veiculo_status}` : null,
        ativacao ? `Contrato: ${ativacao.numero_contrato ?? "—"} — ${ativacao.status}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n---\n");
}

function formatDadosAssociado(d: Record<string, unknown> | null): string {
  if (!d) return "[Dados do associado não encontrados.]";
  const veiculo = (d as any).veiculos?.[0];
  const ativacao = (d as any).ativacoes?.[0];
  const partes = [`Nome: ${d.nome_completo} | Status: ${d.status}`];
  if (veiculo)
    partes.push(
      `Veículo: ${veiculo.modelo} (${veiculo.placa}, ${veiculo.ano}) | Status: ${veiculo.veiculo_status} | Proteção ativa: ${veiculo.protecao_ativa ? "Sim" : "Não"}`
    );
  if (ativacao)
    partes.push(`Contrato: ${ativacao.numero_contrato ?? "—"} | Status: ${ativacao.status}`);
  return partes.join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function normalize(msgs: { role: string; content: string }[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of msgs) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (out.length === 0 && m.role === "assistant") continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += "\n" + m.content;
    } else {
      out.push({ role: m.role as "user" | "assistant", content: String(m.content).trim() });
    }
  }
  if (out.length === 0) out.push({ role: "user", content: "Olá" });
  return out;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json() as {
      messages: { role: string; content: string }[];
      context?: string;
      user_id?: string;
      associado_id?: string;
      consultor_id?: string;
      is_admin?: boolean;
    };

    const { messages, context = "public", user_id, associado_id, consultor_id, is_admin = false } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResp({ error: "messages array required" }, 400);
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not set");
      return jsonResp({ error: "Configuração incompleta." }, 500);
    }

    // ── Seleciona system prompt ─────────────────────────────────────────────
    let systemPrompt =
      context === "associado" ? PROMPT_ASSOCIADO :
      context === "consultor" ? PROMPT_CONSULTOR :
      PROMPT_PUBLIC;

    // ── Detecta intenção e injeta dados reais ───────────────────────────────
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const intent = detectIntent(lastUserMsg, context);
    let dataContext = "";
    let actionTaken: string | undefined;
    let actionData: unknown = undefined;

    if (intent !== "none" && (associado_id || context === "consultor")) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const db = createClient(SUPABASE_URL, SERVICE_KEY);

      if (intent === "buscar_cobranca" && associado_id) {
        const cobranca = await buscarCobrancaAberta(db, associado_id);
        dataContext = formatCobranca(cobranca as Record<string, unknown> | null);
        actionTaken = "buscar_cobranca";
        actionData = cobranca;
      } else if (intent === "buscar_vistoria" && associado_id) {
        const vistoria = await buscarStatusVistoria(db, associado_id);
        dataContext = formatVistoria(vistoria as Record<string, unknown> | null);
        actionTaken = "buscar_vistoria";
        actionData = vistoria;
      } else if (intent === "buscar_mensalidades" && associado_id) {
        const lista = await buscarMensalidadesPendentes(db, associado_id);
        dataContext = formatMensalidades(lista as Record<string, unknown>[]);
        actionTaken = "buscar_mensalidades";
        actionData = lista;
      } else if (intent === "dados_associado" && associado_id) {
        const dados = await buscarDadosAssociado(db, associado_id);
        dataContext = formatDadosAssociado(dados as Record<string, unknown> | null);
        actionTaken = "dados_associado";
        actionData = dados;
      } else if (intent === "buscar_associado" && context === "consultor") {
        // Extrai o termo de busca da mensagem
        const termoMatch = lastUserMsg.match(/(?:buscar|pesquisar|encontrar|cpf|placa)\s+([a-z0-9À-ÿ.\- ]{3,})/i);
        const termo = termoMatch?.[1]?.trim() ?? lastUserMsg.replace(/buscar|pesquisar|cliente|associado/gi, "").trim();
        if (termo.length >= 3) {
          const lista = await buscarAssociadoPorTermo(db, termo, consultor_id ?? null, is_admin);
          dataContext = formatAssociados(lista as Record<string, unknown>[]);
          actionTaken = "buscar_associado";
          actionData = lista;
        }
      }
    }

    // Injeta dados reais no system prompt quando disponíveis
    const systemFinal = dataContext
      ? `${systemPrompt}\n\n--- DADOS DO SISTEMA (use exatamente estas informações) ---\n${dataContext}\n---`
      : systemPrompt;

    // ── Chama Anthropic ─────────────────────────────────────────────────────
    const normalized = normalize(messages);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemFinal,
        messages: normalized,
      }),
    });

    if (resp.status === 429) return jsonResp({ error: "Muitas mensagens. Tente em instantes." }, 429);
    if (resp.status === 401) return jsonResp({ error: "Chave de API inválida." }, 500);

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Anthropic error", resp.status, txt);
      return jsonResp({ error: "Falha na IA." }, 500);
    }

    const result = await resp.json();
    const reply = (result?.content?.[0]?.text as string | undefined)?.trim() ?? "Pode repetir?";

    return jsonResp({
      reply,
      ...(actionTaken ? { action: actionTaken, data: actionData } : {}),
    });
  } catch (e) {
    console.error("emily-chat unhandled", e);
    return jsonResp({ error: "Erro inesperado." }, 500);
  }
});
