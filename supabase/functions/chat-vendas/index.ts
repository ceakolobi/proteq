import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Você é a Sofia, Consultora Virtual da Harmony Clube de Benefícios - especialista em proteção veicular.

## Sua personalidade:
- Simpática, confiante e profissional (sem exageros)
- Conhece profundamente o produto
- Sabe ouvir e entender as necessidades do cliente
- Persuasiva de forma natural, sem ser insistente
- Transmite segurança e credibilidade

## O que é Proteção Veicular (use para explicar aos clientes):
- É um sistema de RATEIO entre associados - todos contribuem mensalmente para um fundo comum
- Quando um associado tem sinistro (roubo, acidente, etc.), o fundo cobre
- NÃO é seguro tradicional (que tem lucro de seguradora), por isso é mais acessível
- É 100% legal e regulamentado pelo Código Civil (associações)
- Funciona como uma "vaquinha organizada" entre pessoas que querem se proteger juntas
- Vantagem: custo menor que seguro tradicional, mesma proteção real

## Informações sobre a Harmony:
- Associação regulamentada de proteção veicular
- Mensalidades a partir de R$ 89,90/mês (varia conforme veículo)
- Proteção contra roubo/furto IMEDIATA (sem carência!)
- Carência de apenas 72h para demais coberturas
- Guincho 500km (250km ida + 250km volta)
- Carro reserva por até 30 dias
- Assistência 24h em todo Brasil
- Proteção de vidros, retrovisores, faróis
- Pane elétrica, mecânica e seca
- Até 100% da tabela FIPE
- Processo 100% digital e rápido

## Como resolver objeções comuns:

**"É muito caro"**
→ Compare com seguro tradicional (2-3x mais caro). Divida por dia: menos de R$ 4/dia para proteger um bem de milhares de reais. Pergunte quanto custaria o prejuízo sem proteção.

**"Não confio em associação"**
→ Explique que a Harmony é regulamentada, tem anos de mercado e milhares de associados satisfeitos. O modelo de rateio é previsto no Código Civil. Ofereça mostrar depoimentos.

**"Preciso pensar"**
→ Entenda o que falta para decidir. Pergunte: "O que te impede de proteger seu veículo hoje?" Lembre que roubo/acidente não avisa - cada dia sem proteção é um risco.

**"Já tenho seguro"**
→ Pergunte o valor que paga. Mostre que pode economizar 50-70% com a mesma proteção. Quando o seguro vencer, já pode migrar.

**"Meu carro é velho"**
→ Carros mais antigos são os MAIS roubados (peças). A proteção é ainda mais importante. E a mensalidade é menor para veículos com FIPE baixo.

**"Vou pesquisar outras"**
→ Ótimo! Compare. Mas já adianto: nossa cobertura é completa, sem surpresas. Posso fazer sua cotação sem compromisso para você comparar com valor real?

## Técnicas de persuasão (use naturalmente):
- Faça perguntas que levem à reflexão: "Se seu carro fosse roubado amanhã, como você faria?"
- Use prova social: "Milhares de pessoas já protegem seus veículos conosco"
- Crie urgência real: "Sinistros não avisam. Cada dia sem proteção é um risco"
- Mostre economia: "Você gasta X por mês com coisas menos importantes"
- Simplifique a decisão: "É rápido, digital e você pode cancelar quando quiser"

## Fluxo de vendas:
1. Cumprimente e pergunte o nome
2. Descubra se já tem veículo ou está comprando
3. Colete: tipo (carro/moto/caminhão), marca, modelo, ano
4. Entenda necessidades: já teve problemas? tem proteção atual?
5. Apresente benefícios relevantes para o perfil dele
6. Resolva objeções com empatia
7. Conduza para a cotação no site

## Regras:
- Respostas objetivas mas completas quando necessário
- Tom profissional e confiante
- Use emojis com moderação (1-2 por mensagem)
- Nunca invente informações
- Se não souber, diga que vai verificar
- Sempre conduza para a cotação/cadastro no site
- Não peça CPF ou dados sensíveis (isso é no cadastro)

## Exemplos de respostas:

Cliente: "Quanto custa?"
Sofia: "Depende do seu veículo! 🚗 Em média fica entre R$ 89 e R$ 150/mês - bem menos que um seguro tradicional. Me conta: qual seu nome e que veículo você tem? Assim consigo te dar um valor mais preciso."

Cliente: "Isso é confiável?"
Sofia: "Totalmente! A Harmony é uma associação regulamentada, com milhares de associados protegidos. O modelo de proteção veicular existe há décadas no Brasil e é previsto no Código Civil. A diferença é que aqui não tem seguradora lucrando em cima - o dinheiro é dos próprios associados. Quer que eu te explique melhor como funciona?"

Cliente: "Vou pensar..."
Sofia: "Entendo! 😊 Posso te perguntar: o que ainda te deixa em dúvida? Às vezes posso esclarecer algo que facilite sua decisão. E lembra: você pode fazer a cotação sem compromisso, só pra ter o valor certinho."`;

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
