import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-origem',
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

// Tipos suportados pela FIPE
const tiposSuportadosFipe = ['carro', 'moto', 'caminhao', 'pickup', 'utilitario', 'carreta'];

interface FipeValorResponse {
  TipoVeiculo: number;
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

interface StandardResponse {
  success: boolean;
  data: unknown;
  meta: {
    origem: string;
    cache: boolean;
    consultadoEm: string;
    mesReferencia?: string;
  };
  error?: string;
}

// Função para criar resposta padronizada
function createStandardResponse(
  success: boolean,
  data: unknown,
  cache: boolean = false,
  mesReferencia?: string,
  error?: string
): StandardResponse {
  return {
    success,
    data,
    meta: {
      origem: 'FIPE',
      cache,
      consultadoEm: new Date().toISOString(),
      ...(mesReferencia && { mesReferencia }),
    },
    ...(error && { error }),
  };
}

// Função para parsear valor FIPE (ex: "R$ 50.000,00" -> 50000.00)
function parseValorFipe(valor: string): number {
  return parseFloat(
    valor
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Criar cliente Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extrair dados de autenticação
  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;
  let userEmail: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      userEmail = user.email || null;
    }
  }

  // Dados de auditoria
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const origem = req.headers.get('x-origem') || 'web';

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Find 'fipe' in path and get the next segment as endpoint
    const fipeIndex = pathParts.indexOf('fipe');
    const endpoint = fipeIndex >= 0 && pathParts[fipeIndex + 1] ? pathParts[fipeIndex + 1] : null;
    
    // Get query params
    const tipo = url.searchParams.get('tipo') || 'carro';
    const marcaId = url.searchParams.get('marcaId');
    const modeloId = url.searchParams.get('modeloId');
    const anoId = url.searchParams.get('anoId');
    
    // Verificar se tipo é suportado pela FIPE
    if (!tiposSuportadosFipe.includes(tipo)) {
      return new Response(
        JSON.stringify(createStandardResponse(
          false,
          null,
          false,
          undefined,
          `Tipo "${tipo}" não é suportado pela consulta FIPE. Use Valor Venal ou Nota Fiscal.`
        )),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const fipeTipo = tipoParaFipe[tipo] || 'carros';
    const parametros = { tipo, marcaId, modeloId, anoId, endpoint };
    
    console.log(`[FIPE API] Path: ${url.pathname}, Endpoint: ${endpoint}, Tipo: ${tipo}, User: ${userEmail || 'anonymous'}`);

    let result: unknown;
    let cacheHit = false;
    let mesReferencia: string | undefined;

    switch (endpoint) {
      case 'marcas': {
        // GET /api/fipe/marcas?tipo=carro|moto|caminhao
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar marcas: ${response.status}`);
        }
        const marcas = await response.json();
        result = marcas.map((m: { codigo: string; nome: string }) => ({
          id: m.codigo,
          nome: m.nome,
        }));
        console.log(`[FIPE] Marcas encontradas: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'modelos': {
        // GET /api/fipe/modelos?tipo=&marcaId=
        if (!marcaId) {
          return new Response(
            JSON.stringify(createStandardResponse(false, null, false, undefined, 'marcaId é obrigatório')),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar modelos: ${response.status}`);
        }
        const data = await response.json();
        const modelos = data.modelos || data;
        result = modelos.map((m: { codigo: number; nome: string }) => ({
          id: String(m.codigo),
          nome: m.nome,
        }));
        console.log(`[FIPE] Modelos encontrados: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'anos': {
        // GET /api/fipe/anos?tipo=&marcaId=&modeloId=
        if (!marcaId || !modeloId) {
          return new Response(
            JSON.stringify(createStandardResponse(false, null, false, undefined, 'marcaId e modeloId são obrigatórios')),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetch(`${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar anos: ${response.status}`);
        }
        const anos = await response.json();
        result = anos.map((a: { codigo: string; nome: string }) => ({
          id: a.codigo,
          nome: a.nome,
        }));
        console.log(`[FIPE] Anos encontrados: ${Array.isArray(result) ? result.length : 0}`);
        break;
      }

      case 'valor': {
        // GET /api/fipe/valor?tipo=&marcaId=&modeloId=&anoId=
        if (!marcaId || !modeloId || !anoId) {
          return new Response(
            JSON.stringify(createStandardResponse(false, null, false, undefined, 'marcaId, modeloId e anoId são obrigatórios')),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verificar cache primeiro
        const { data: cachedData } = await supabase
          .from('fipe_cache')
          .select('*')
          .eq('tipo_veiculo', tipo)
          .eq('marca_id', marcaId)
          .eq('modelo_id', modeloId)
          .eq('ano_id', anoId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cachedData) {
          console.log(`[FIPE] Cache hit para ${tipo}/${marcaId}/${modeloId}/${anoId}`);
          cacheHit = true;
          mesReferencia = cachedData.mes_referencia;
          result = {
            tipoVeiculo: tipo,
            valor: cachedData.valor,
            valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cachedData.valor),
            marca: cachedData.marca_nome,
            modelo: cachedData.modelo_nome,
            anoModelo: parseInt(cachedData.ano_nome.split(' ')[0]) || parseInt(cachedData.ano_id),
            combustivel: cachedData.combustivel,
            codigoFipe: cachedData.codigo_fipe,
            mesReferencia: cachedData.mes_referencia,
          };
        } else {
          // Buscar da API FIPE
          const valorUrl = `${FIPE_API_BASE}/${fipeTipo}/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`;
          console.log(`[FIPE] Buscando valor em: ${valorUrl}`);
          
          const response = await fetch(valorUrl);
          const responseText = await response.text();
          console.log(`[FIPE] Response status: ${response.status}`);
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar valor: ${response.status} - ${responseText}`);
          }
          
          const fipeData: FipeValorResponse = JSON.parse(responseText);
          console.log(`[FIPE] Valor encontrado:`, fipeData);
          
          const valorNumerico = parseValorFipe(fipeData.Valor);
          mesReferencia = fipeData.MesReferencia;

          // Salvar no cache
          await supabase
            .from('fipe_cache')
            .upsert({
              tipo_veiculo: tipo,
              marca_id: marcaId,
              marca_nome: fipeData.Marca,
              modelo_id: modeloId,
              modelo_nome: fipeData.Modelo,
              ano_id: anoId,
              ano_nome: String(fipeData.AnoModelo),
              codigo_fipe: fipeData.CodigoFipe,
              valor: valorNumerico,
              mes_referencia: fipeData.MesReferencia,
              combustivel: fipeData.Combustivel,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }, {
              onConflict: 'tipo_veiculo,marca_id,modelo_id,ano_id',
            });

          result = {
            tipoVeiculo: tipo,
            valor: valorNumerico,
            valorFormatado: fipeData.Valor,
            marca: fipeData.Marca,
            modelo: fipeData.Modelo,
            anoModelo: fipeData.AnoModelo,
            combustivel: fipeData.Combustivel,
            codigoFipe: fipeData.CodigoFipe,
            mesReferencia: fipeData.MesReferencia,
          };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify(createStandardResponse(
            false,
            {
              marcas: 'GET /api/fipe/marcas?tipo=carro|moto|caminhao',
              modelos: 'GET /api/fipe/modelos?tipo=&marcaId=',
              anos: 'GET /api/fipe/anos?tipo=&marcaId=&modeloId=',
              valor: 'GET /api/fipe/valor?tipo=&marcaId=&modeloId=&anoId='
            },
            false,
            undefined,
            'Endpoint inválido'
          )),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Registrar log de consulta (auditoria LGPD)
    await supabase
      .from('fipe_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        endpoint: endpoint || 'unknown',
        parametros,
        ip_address: ipAddress,
        user_agent: userAgent,
        origem,
        sucesso: true,
        cache_hit: cacheHit,
      });

    return new Response(
      JSON.stringify(createStandardResponse(true, result, cacheHit, mesReferencia)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FIPE] Erro:', error);
    
    // Registrar log de erro
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const fipeIndex = pathParts.indexOf('fipe');
    const endpoint = fipeIndex >= 0 && pathParts[fipeIndex + 1] ? pathParts[fipeIndex + 1] : 'unknown';
    
    await supabase
      .from('fipe_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        endpoint,
        parametros: {
          tipo: url.searchParams.get('tipo'),
          marcaId: url.searchParams.get('marcaId'),
          modeloId: url.searchParams.get('modeloId'),
          anoId: url.searchParams.get('anoId'),
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        origem,
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        cache_hit: false,
      });

    return new Response(
      JSON.stringify(createStandardResponse(
        false,
        null,
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro desconhecido'
      )),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
