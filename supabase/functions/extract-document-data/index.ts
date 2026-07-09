import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS: Record<string, string> = {
  cnh: `Analise esta CNH brasileira e extraia os dados em JSON puro, sem markdown, sem explicação:
{
  "nome_completo": "nome como aparece no documento",
  "cpf": "somente dígitos, 11 caracteres",
  "rg": "somente dígitos",
  "data_nascimento": "YYYY-MM-DD",
  "cnh_numero": "número do registro",
  "cnh_categoria": "ex: AB, B, C, D, E",
  "cnh_validade": "YYYY-MM-DD"
}
Omita campos não visíveis ou ilegíveis. Retorne APENAS o JSON.`,

  crlv: `Analise este CRLV (Certificado de Registro e Licenciamento de Veículo) brasileiro e extraia os dados em JSON puro, sem markdown, sem explicação:
{
  "placa": "sem traço, ex: ABC1234 ou ABC1D23",
  "renavam": "somente dígitos",
  "chassi": "somente caracteres alfanuméricos, sem espaços",
  "marca": "fabricante",
  "modelo": "modelo completo",
  "ano_fabricacao": 2020,
  "ano_modelo": 2021,
  "cor": "uma destas: branco/preto/prata/cinza/vermelho/azul/verde/amarelo/marrom/bege/outro",
  "combustivel": "uma destas: gasolina/etanol/flex/diesel/gnv/eletrico/hibrido"
}
Omita campos não visíveis. Retorne APENAS o JSON.`,

  comprovante_endereco: `Analise este comprovante de residência brasileiro e extraia os dados em JSON puro, sem markdown, sem explicação:
{
  "cep": "somente 8 dígitos",
  "endereco": "nome do logradouro sem número",
  "numero": "número do imóvel",
  "complemento": "apto, bloco etc se houver",
  "bairro": "bairro",
  "cidade": "cidade",
  "estado": "sigla UF, ex: SC"
}
Omita campos não visíveis. Retorne APENAS o JSON.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: object) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Verificar autenticação mínima (sessão válida)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ success: false, error: "Não autorizado" });

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return respond({ success: false, error: "ANTHROPIC_API_KEY não configurada" });

    const { fileBase64, mediaType, documentKind } = await req.json();

    if (!fileBase64 || !mediaType || !documentKind) {
      return respond({ success: false, error: "fileBase64, mediaType e documentKind são obrigatórios" });
    }

    const prompt = PROMPTS[documentKind];
    if (!prompt) {
      return respond({ success: false, error: `documentKind inválido: ${documentKind}` });
    }

    const isPdf = mediaType === "application/pdf";

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[extract-document-data] Anthropic error:", errText);
      return respond({ success: false, error: `Erro na API Anthropic: ${anthropicRes.status}` });
    }

    const message = await anthropicRes.json();

    const rawText = message.content?.[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return respond({ success: false, error: "Não foi possível extrair dados do documento. Tente uma foto mais nítida." });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return respond({ success: true, data: extracted, documentKind });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[extract-document-data]", msg);
    return respond({ success: false, error: msg });
  }
});
