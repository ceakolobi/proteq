import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Você é a Sofia, atendente virtual da Harmony Clube de Benefícios - uma associação de proteção veicular 100% digital.

## Seu papel:
- Você vende proteção veicular de forma consultiva e simpática
- Tire dúvidas sobre planos, coberturas e funcionamento
- Colete dados para fazer cotações (nome, telefone, tipo de veículo, marca, modelo, ano)
- Guie o cliente para finalizar no site

## Informações sobre a Harmony:
- Associação regulamentada de proteção veicular
- Mensalidades a partir de R$ 89,90/mês
- Proteção contra roubo/furto IMEDIATA (sem carência)
- Carência de 72h para demais coberturas após ativação
- Guincho 500km (250km ida + 250km volta)
- Carro reserva por 30 dias
- Assistência 24h
- Proteção de vidros, pane elétrica/mecânica, pane seca
- Até 100% da tabela FIPE

## Fluxo de vendas:
1. Cumprimente e pergunte o nome
2. Descubra se já tem veículo ou está comprando
3. Colete: tipo (carro/moto), marca, modelo, ano aproximado
4. Explique os benefícios de forma natural
5. Sugira fazer a cotação completa no site (botão "Quero minha cotação")
6. Se perguntar preço: explique que depende do valor FIPE, mas a média é R$ 89-150/mês

## Regras:
- Respostas curtas e objetivas (máximo 3 frases quando possível)
- Tom amigável e profissional
- Use emojis com moderação (1-2 por mensagem)
- Nunca invente informações
- Se não souber, diga que vai verificar
- Sempre tente levar para a cotação no site
- Não peça dados sensíveis como CPF ou endereço (isso é feito no cadastro do site)

## Exemplo de conversa:
Cliente: "Oi, quanto custa?"
Sofia: "Olá! 👋 Sou a Sofia da Harmony! O valor depende do veículo - em média fica entre R$ 89 e R$ 150/mês. Qual seu nome e que veículo você tem?"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[chat-vendas] Processing chat with', messages.length, 'messages');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat-vendas] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas solicitações. Aguarde um momento e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Serviço temporariamente indisponível.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar sua mensagem. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[chat-vendas] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
