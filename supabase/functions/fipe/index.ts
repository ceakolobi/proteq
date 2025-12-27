import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v1';

// Mapear tipos do sistema para tipos da API FIPE
const tipoParaFipe: Record<string, string> = {
  'carro': 'carros',
  'moto': 'motos',
  'pickup': 'carros',
  'caminhao': 'caminhoes',
  'utilitario': 'carros',
  'carreta': 'caminhoes',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Get endpoint from path: /fipe/marcas, /fipe/modelos, etc.
    const endpoint = pathParts[pathParts.length - 1];
    
    // Get query params
    const tipo = url.searchParams.get('tipo') || 'carro';
    const marcaId = url.searchParams.get('marcaId');
    const modeloId = url.searchParams.get('modeloId');
    const anoId = url.searchParams.get('anoId');
    
    const fipeTipo = tipoParaFipe[tipo] || 'carros';
    
    console.log(`[FIPE] Endpoint: ${endpoint}, Tipo: ${tipo}, FipeTipo: ${fipeTipo}`);

    let result: unknown;

    switch (endpoint) {
      case 'marcas': {
        // GET /marcas?tipo=carro|moto|caminhao
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar marcas: ${response.status}`);
        }
        result = await response.json();
        console.log(`[FIPE] Marcas encontradas: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'modelos': {
        // GET /modelos?tipo=&marcaId=
        if (!marcaId) {
          return new Response(
            JSON.stringify({ error: 'marcaId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar modelos: ${response.status}`);
        }
        const data = await response.json();
        // A API retorna { modelos: [...], anos: [...] }
        result = data.modelos || data;
        console.log(`[FIPE] Modelos encontrados para marca ${marcaId}: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'anos': {
        // GET /anos?tipo=&marcaId=&modeloId=
        if (!marcaId || !modeloId) {
          return new Response(
            JSON.stringify({ error: 'marcaId e modeloId são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar anos: ${response.status}`);
        }
        result = await response.json();
        console.log(`[FIPE] Anos encontrados para modelo ${modeloId}: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'valor': {
        // GET /valor?tipo=&marcaId=&modeloId=&anoId=
        if (!marcaId || !modeloId || !anoId) {
          return new Response(
            JSON.stringify({ error: 'marcaId, modeloId e anoId são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar valor: ${response.status}`);
        }
        result = await response.json();
        console.log(`[FIPE] Valor encontrado:`, result);
        break;
      }

      default:
        // Fallback: check action param for backward compatibility
        const action = url.searchParams.get('action');
        if (action) {
          return handleLegacyAction(action, tipo, fipeTipo, marcaId, modeloId, anoId);
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Endpoint inválido. Use: /marcas, /modelos, /anos ou /valor',
            endpoints: {
              marcas: 'GET /marcas?tipo=carro|moto|caminhao',
              modelos: 'GET /modelos?tipo=&marcaId=',
              anos: 'GET /anos?tipo=&marcaId=&modeloId=',
              valor: 'GET /valor?tipo=&marcaId=&modeloId=&anoId='
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FIPE] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Legacy action handler for backward compatibility
async function handleLegacyAction(
  action: string, 
  tipo: string, 
  fipeTipo: string, 
  marcaId: string | null, 
  modeloId: string | null, 
  anoId: string | null
): Promise<Response> {
  let result: unknown;

  switch (action) {
    case 'marcas': {
      const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas`);
      if (!response.ok) throw new Error(`Erro ao buscar marcas: ${response.status}`);
      result = await response.json();
      break;
    }
    case 'modelos': {
      if (!marcaId) {
        return new Response(
          JSON.stringify({ error: 'marcaId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos`);
      if (!response.ok) throw new Error(`Erro ao buscar modelos: ${response.status}`);
      const data = await response.json();
      result = data.modelos || data;
      break;
    }
    case 'anos': {
      if (!marcaId || !modeloId) {
        return new Response(
          JSON.stringify({ error: 'marcaId e modeloId são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos`);
      if (!response.ok) throw new Error(`Erro ao buscar anos: ${response.status}`);
      result = await response.json();
      break;
    }
    case 'valor': {
      if (!marcaId || !modeloId || !anoId) {
        return new Response(
          JSON.stringify({ error: 'marcaId, modeloId e anoId são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`);
      if (!response.ok) throw new Error(`Erro ao buscar valor: ${response.status}`);
      result = await response.json();
      break;
    }
    default:
      return new Response(
        JSON.stringify({ error: 'Ação inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
