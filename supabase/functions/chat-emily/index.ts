// Edge function: chat-emily
// Consultora virtual Emily — usa Lovable AI Gateway (gemini-2.5-flash)
// Regras: Direct-to-Plate, 2-3 linhas, 1 emoji, sem taxa de adesão,
// sem análise de condutor, sem consulta SPC/Serasa.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é Emily, consultora virtual da Harmony Proteção Veicular (mutualismo, não é seguro).

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em no máximo 2 a 3 linhas curtas.
- Use no máximo 1 emoji por mensagem (opcional).
- Tom: humano, simpático, direto, brasileiro.
- Regra "Direct-to-Plate": se o usuário mencionar cotação, preço, valor, mensalidade, plano ou proteção, peça IMEDIATAMENTE a placa do veículo (formato ABC1D23 ou ABC-1234) para gerar a cotação. Não enrole.
- Quando receber uma placa válida, confirme que vai preparar a cotação e oriente clicar em "Fazer cotação" no site para concluir o cadastro.
- Diferenciais que pode destacar quando fizer sentido: 1ª mensalidade grátis, sem taxa de adesão, sem análise de condutor, sem consulta SPC/Serasa, ativação rápida.
- Nunca invente valores ou prazos que não estejam acima.
- Se perguntarem algo fora do escopo (proteção veicular), responda brevemente e traga de volta para a cotação.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sanitiza mensagens vindas do cliente
    const safeMessages = messages
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas mensagens, aguarde um instante." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `IA falhou [${aiResp.status}]: ${text.slice(0, 300)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Desculpe, não entendi. Pode repetir? 😊";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
