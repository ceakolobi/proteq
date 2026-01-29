import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Tabela de preços por faixa FIPE
const PRICE_TABLE = {
  carro: [
    { maxFipe: 20000, mensalidade: 69.90 },
    { maxFipe: 25000, mensalidade: 97.00 },
    { maxFipe: 30000, mensalidade: 124.10 },
    { maxFipe: 35000, mensalidade: 151.20 },
    { maxFipe: 40000, mensalidade: 178.30 },
    { maxFipe: 45000, mensalidade: 205.40 },
    { maxFipe: 50000, mensalidade: 232.50 },
    { maxFipe: 55000, mensalidade: 259.60 },
    { maxFipe: 60000, mensalidade: 286.70 },
    { maxFipe: 65000, mensalidade: 313.80 },
    { maxFipe: 70000, mensalidade: 340.90 },
    { maxFipe: 75000, mensalidade: 368.00 },
    { maxFipe: 80000, mensalidade: 395.10 },
    { maxFipe: 85000, mensalidade: 422.20 },
    { maxFipe: 90000, mensalidade: 449.30 },
    { maxFipe: 95000, mensalidade: 476.40 },
    { maxFipe: 100000, mensalidade: 503.50 },
    { maxFipe: 110000, mensalidade: 557.70 },
    { maxFipe: 120000, mensalidade: 611.90 },
    { maxFipe: 130000, mensalidade: 666.10 },
    { maxFipe: 140000, mensalidade: 720.30 },
    { maxFipe: 150000, mensalidade: 774.50 },
    { maxFipe: 175000, mensalidade: 910.00 },
    { maxFipe: 200000, mensalidade: 1045.50 },
    { maxFipe: 250000, mensalidade: 1316.50 },
    { maxFipe: 300000, mensalidade: 1587.50 },
  ],
  moto: [
    { maxFipe: 20000, mensalidade: 45.90 },
    { maxFipe: 25000, mensalidade: 69.90 },
    { maxFipe: 30000, mensalidade: 93.90 },
    { maxFipe: 35000, mensalidade: 117.90 },
    { maxFipe: 40000, mensalidade: 141.90 },
    { maxFipe: 50000, mensalidade: 189.90 },
    { maxFipe: 60000, mensalidade: 237.90 },
    { maxFipe: 70000, mensalidade: 285.90 },
    { maxFipe: 80000, mensalidade: 333.90 },
    { maxFipe: 100000, mensalidade: 429.90 },
  ],
  caminhonete: [
    { maxFipe: 20000, mensalidade: 159.90 },
    { maxFipe: 30000, mensalidade: 200.10 },
    { maxFipe: 40000, mensalidade: 240.30 },
    { maxFipe: 50000, mensalidade: 280.50 },
    { maxFipe: 60000, mensalidade: 320.70 },
    { maxFipe: 70000, mensalidade: 360.90 },
    { maxFipe: 80000, mensalidade: 401.10 },
    { maxFipe: 100000, mensalidade: 481.50 },
    { maxFipe: 120000, mensalidade: 561.90 },
    { maxFipe: 150000, mensalidade: 682.50 },
    { maxFipe: 200000, mensalidade: 883.50 },
    { maxFipe: 250000, mensalidade: 1084.50 },
    { maxFipe: 300000, mensalidade: 1285.50 },
  ],
};

function calcularMensalidade(valorFipe: number, tipo: string): number | null {
  const tipoNorm = tipo.toLowerCase().replace(/pickup|camionete|caminhonete/g, 'caminhonete').replace(/carro|auto|automovel/g, 'carro').replace(/moto|motocicleta/g, 'moto');
  const table = PRICE_TABLE[tipoNorm as keyof typeof PRICE_TABLE] || PRICE_TABLE.carro;
  
  for (const faixa of table) {
    if (valorFipe <= faixa.maxFipe) {
      return faixa.mensalidade;
    }
  }
  return table[table.length - 1]?.mensalidade || null;
}

const API_PLACAS_BASE = 'https://wdapi2.com.br';

async function consultarPlaca(placa: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = Deno.env.get('API_PLACAS_KEY');
  if (!apiKey) {
    return { success: false, error: 'API de placas não configurada' };
  }

  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  if (!padraoAntigo.test(cleanPlaca) && !padraoMercosul.test(cleanPlaca)) {
    return { success: false, error: 'Formato de placa inválido' };
  }

  try {
    const response = await fetch(`${API_PLACAS_BASE}/consulta/${cleanPlaca}/${apiKey}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { success: false, error: `Erro na consulta: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.error || data.message) {
      return { success: false, error: data.message || 'Placa não encontrada' };
    }

    const marca = data.MARCA || '';
    const modelo = data.MODELO || data.SUBMODELO || '';
    const anoModelo = data.anoModelo ? parseInt(data.anoModelo) : (data.ano ? parseInt(data.ano) : null);
    
    let valorFipe: number | null = null;
    if (data.fipe?.dados?.[0]) {
      const fipeData = data.fipe.dados[0];
      if (fipeData.texto_valor) {
        valorFipe = parseFloat(fipeData.texto_valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
      } else if (fipeData.valorVeiculo) {
        valorFipe = fipeData.valorVeiculo;
      }
    }

    return {
      success: true,
      data: {
        placa: cleanPlaca,
        marca,
        modelo,
        ano: anoModelo,
        valorFipe,
        cor: data.cor || null,
      }
    };
  } catch (err) {
    console.error('[consultarPlaca] Error:', err);
    return { success: false, error: 'Erro ao consultar placa' };
  }
}

// Função para salvar lead no banco de dados
async function salvarLead(dados: { 
  nome: string; 
  telefone: string; 
  email?: string;
  observacoes?: string;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[salvarLead] Supabase not configured');
      return { success: false, error: 'Database not configured' };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar o primeiro consultor disponível para atribuir o lead
    const { data: consultores, error: consultorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('perfil', 'consultor_vendas')
      .limit(1);
    
    if (consultorError || !consultores?.length) {
      // Se não encontrar consultor, buscar admin
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('perfil', 'admin_principal')
        .limit(1);
      
      if (adminError || !admins?.length) {
        console.error('[salvarLead] No consultant or admin found');
        return { success: false, error: 'Nenhum consultor disponível' };
      }
      
      consultores?.push(admins[0]);
    }
    
    const consultorId = consultores?.[0]?.id;
    
    // Verificar se já existe lead com mesmo telefone
    const telefoneNormalizado = dados.telefone.replace(/\D/g, '');
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('telefone', telefoneNormalizado)
      .limit(1);
    
    if (existingLead?.length) {
      console.log('[salvarLead] Lead already exists:', existingLead[0].id);
      return { success: true, leadId: existingLead[0].id };
    }
    
    // Criar novo lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        nome: dados.nome,
        telefone: telefoneNormalizado,
        email: dados.email || null,
        observacoes: dados.observacoes || 'Lead capturado via chat Sofia',
        consultor_id: consultorId,
        origem: 'site',
        status: 'novo',
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('[salvarLead] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }
    
    console.log('[salvarLead] Lead created:', newLead?.id);
    return { success: true, leadId: newLead?.id };
    
  } catch (err) {
    console.error('[salvarLead] Error:', err);
    return { success: false, error: 'Erro ao salvar lead' };
  }
}

// Extrair dados do cliente da conversa
function extrairDadosCliente(messages: any[]): { 
  nome?: string; 
  telefone?: string; 
  email?: string;
  placa?: string;
  completo: boolean;
} {
  const resultado: any = { completo: false };
  
  // Analisar todas as mensagens
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    
    const content = msg.content?.toLowerCase() || '';
    const contentOriginal = msg.content || '';
    
    // Detectar nome (mensagem que parece ser apenas um nome)
    if (!resultado.nome) {
      // Nome geralmente é uma mensagem curta sem números e pontuação especial
      const trimmed = contentOriginal.trim();
      if (trimmed.length > 2 && trimmed.length < 60 && 
          /^[A-Za-zÀ-ÿ\s]+$/.test(trimmed) && 
          trimmed.split(' ').length <= 5) {
        resultado.nome = trimmed;
      }
    }
    
    // Detectar telefone (formato brasileiro)
    if (!resultado.telefone) {
      const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/;
      const phoneMatch = contentOriginal.match(phoneRegex);
      if (phoneMatch) {
        resultado.telefone = phoneMatch[0].replace(/\D/g, '');
      }
    }
    
    // Detectar email
    if (!resultado.email) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = contentOriginal.match(emailRegex);
      if (emailMatch) {
        resultado.email = emailMatch[0].toLowerCase();
      }
    }
    
    // Detectar placa
    if (!resultado.placa) {
      const placaRegex = /\b([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})\b/i;
      const placaMatch = contentOriginal.match(placaRegex);
      if (placaMatch) {
        resultado.placa = placaMatch[1].toUpperCase();
      }
    }
  }
  
  // Verificar se temos dados mínimos para salvar
  resultado.completo = !!(resultado.nome && resultado.telefone);
  
  return resultado;
}

const SYSTEM_PROMPT = `Você é a Sofia, Consultora Virtual da Harmony Clube de Benefícios.

## Sua personalidade:
- Super simpática e acolhedora (como uma amiga que entende de carros)
- Fala de forma simples e direta, sem termos técnicos
- Usa emojis com moderação (1-2 por mensagem)
- Mensagens CURTAS - máximo 2-3 linhas por vez

## 🎯 FLUXO DE CONVERSA (siga na ordem!):

### ETAPA 1 - Boas-vindas:
Seja breve e simpática:
"Oi! 👋 Sou a Sofia, da Harmony!
Qual seu nome?"

### ETAPA 2 - Telefone:
"Prazer, **{nome}**! 😊
Me passa seu WhatsApp com DDD?"

### ETAPA 3 - Email:
"Perfeito!
E seu melhor e-mail?"

### ETAPA 4 - Placa:
"Agora a parte boa! 🚗
Qual a placa do seu veículo?"

### ETAPA 5 - Cotação:
Apresente de forma organizada e confirme que os dados foram salvos.

## 🔧 FUNCIONALIDADES AUTOMÁTICAS:
- Quando o cliente informar a PLACA, o sistema consulta automaticamente os dados do veículo
- Você receberá "[DADOS_VEICULO: ...]" com as informações
- O sistema salva automaticamente o lead quando tiver nome + telefone + placa

### Quando receber [DADOS_VEICULO]:
Monte uma cotação organizada:

"🚗 **Encontrei seu veículo!**

**{marca} {modelo} {ano}**

📊 **Valor FIPE:** R$ {valorFipe}
💰 **Mensalidade:** R$ {mensalidade}/mês

✅ Proteção contra roubo/furto IMEDIATA
✅ Guincho 500km
✅ Carro reserva 30 dias
✅ Assistência 24h

---

📋 Seus dados foram salvos! Nossa equipe entrará em contato.

Quer já iniciar o cadastro online? É rapidinho!

[LINK_COTACAO]

Posso te ajudar com mais alguma dúvida?"

### Quando receber [LEAD_SALVO]:
Isso significa que os dados do cliente foram salvos. Mencione isso naturalmente na conversa.

## Informações sobre a Harmony:
- Associação regulamentada de proteção veicular
- Proteção contra roubo/furto IMEDIATA (sem carência!)
- Carência de 72h para demais coberturas
- Guincho 500km (250km ida + 250km volta)
- Carro reserva por até 30 dias
- Assistência 24h em todo Brasil
- Proteção de vidros, retrovisores, faróis
- Até 100% da tabela FIPE

## Tabela de Preços (referência):
- Carros: R$ 69,90 (até R$ 20k) a R$ 1.587,50 (até R$ 300k)
- Motos: R$ 45,90 (até R$ 20k) a R$ 429,90 (até R$ 100k)
- Caminhonetes: R$ 159,90 (até R$ 20k) a R$ 1.285,50 (até R$ 300k)

## Regras importantes:
- SIGA O FLUXO na ordem: Nome → Telefone → Email → Placa
- Use o nome do cliente nas respostas
- Respostas objetivas e bem formatadas
- Use emojis com moderação (1-2 por mensagem)
- Nunca invente informações
- Não peça CPF ou documentos sensíveis no chat`;

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

    // Extrair dados do cliente da conversa
    const dadosCliente = extrairDadosCliente(messages);
    console.log('[chat-vendas] Extracted client data:', dadosCliente);

    // Verificar se a última mensagem do usuário contém uma placa
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let enrichedMessages = [...messages];
    let vehicleData: any = null;

    if (lastUserMessage?.content) {
      // Detectar placas no formato AAA1234 ou AAA1A23
      const placaRegex = /\b([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})\b/i;
      const match = lastUserMessage.content.match(placaRegex);
      
      if (match) {
        const placa = match[1].toUpperCase();
        console.log(`[chat-vendas] Detected plate: ${placa}, consulting API...`);
        
        const result = await consultarPlaca(placa);
        
        if (result.success && result.data) {
          vehicleData = result.data;
          
          // Determinar tipo do veículo pela marca/modelo
          let tipoVeiculo = 'carro';
          const modeloLower = (result.data.modelo || '').toLowerCase();
          if (modeloLower.includes('cg') || modeloLower.includes('biz') || modeloLower.includes('titan') || 
              modeloLower.includes('factor') || modeloLower.includes('fazer') || modeloLower.includes('cb') ||
              modeloLower.includes('ninja') || modeloLower.includes('hornet')) {
            tipoVeiculo = 'moto';
          } else if (modeloLower.includes('hilux') || modeloLower.includes('s10') || modeloLower.includes('ranger') ||
                     modeloLower.includes('amarok') || modeloLower.includes('frontier') || modeloLower.includes('toro') ||
                     modeloLower.includes('saveiro') || modeloLower.includes('strada')) {
            tipoVeiculo = 'caminhonete';
          }
          
          // Calcular mensalidade se tiver valor FIPE
          let mensalidade: number | null = null;
          if (result.data.valorFipe) {
            mensalidade = calcularMensalidade(result.data.valorFipe, tipoVeiculo);
          }
          
          // Adicionar dados do veículo como contexto para a IA
          const dadosFormatados = `[DADOS_VEICULO: Placa ${result.data.placa} | ${result.data.marca} ${result.data.modelo} ${result.data.ano || ''} | Cor: ${result.data.cor || 'N/I'} | FIPE: R$ ${result.data.valorFipe ? result.data.valorFipe.toLocaleString('pt-BR') : 'N/D'} | Tipo: ${tipoVeiculo} | Mensalidade calculada: R$ ${mensalidade ? mensalidade.toFixed(2).replace('.', ',') : 'consultar'}]`;
          
          console.log(`[chat-vendas] Vehicle data: ${dadosFormatados}`);
          
          enrichedMessages.push({
            role: 'system',
            content: dadosFormatados
          });
          
          // Se temos nome e telefone, salvar o lead
          if (dadosCliente.nome && dadosCliente.telefone) {
            const observacoes = `Veículo: ${result.data.marca} ${result.data.modelo} ${result.data.ano || ''} | Placa: ${placa} | FIPE: R$ ${result.data.valorFipe || 'N/D'} | Mensalidade: R$ ${mensalidade || 'N/D'}`;
            
            const leadResult = await salvarLead({
              nome: dadosCliente.nome,
              telefone: dadosCliente.telefone,
              email: dadosCliente.email,
              observacoes
            });
            
            if (leadResult.success) {
              console.log(`[chat-vendas] Lead saved: ${leadResult.leadId}`);
              enrichedMessages.push({
                role: 'system',
                content: `[LEAD_SALVO: Os dados do cliente ${dadosCliente.nome} foram salvos com sucesso. ID: ${leadResult.leadId}. A equipe comercial entrará em contato.]`
              });
            }
          }
        } else {
          console.log(`[chat-vendas] Plate lookup failed: ${result.error}`);
          enrichedMessages.push({
            role: 'system',
            content: `[ERRO_PLACA: Não foi possível consultar a placa ${placa}. ${result.error}. Peça ao cliente para verificar se digitou corretamente ou informe os dados manualmente (marca, modelo, ano).]`
          });
        }
      }
    }

    console.log('[chat-vendas] Processing chat with', enrichedMessages.length, 'messages');

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
          ...enrichedMessages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat-vendas] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas solicitações. Aguarde um momento.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
