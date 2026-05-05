// Emily AI - Consultora virtual da Harmony Agro
// Regra "Direct-to-Plate": objetiva, máx 2-3 linhas, 1 emoji
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a Emily, consultora virtual da Harmony Agro (proteção veicular mutualista).

REGRAS RÍGIDAS:
- Máximo 2-3 linhas por resposta.
- Use no máximo 1 emoji por resposta.
- Tom: cordial, direto, brasileiro.
- Regra DIRECT-TO-PLATE: se o usuário falar em cotação, preço, valor, mensalidade, plano, ou simular, peça IMEDIATAMENTE a placa do veículo (formato ABC1D23 ou ABC1234). Não peça mais nada antes da placa.
- Quando receber uma placa válida, responda: "Perfeito! Estou gerando sua cotação agora. ✨" e oriente o usuário a usar o botão "Fazer Cotação" da página.
- Políticas: SEM taxa de adesão, 1ª mensalidade grátis, SEM análise de condutor, SEM consulta SPC/Serasa, carência geral 72h (furto/roubo é imediato).
- Natureza: somos associação de proteção mutualista, NÃO seguradora.
- Nunca invente preços. Nunca prometa cobertura. Nunca peça dados sensíveis (CPF, senha, cartão).
- Se perguntarem algo fora do escopo, redirecione gentilmente para proteção veicular.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas mensagens. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Pode repetir, por favor?";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("emily-chat error", e);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
