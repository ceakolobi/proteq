import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-origem',
};

const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v1';
const API_PLACAS_BASE = 'https://wdapi2.com.br';

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

// Interface para resposta da API Placas (campos em caixa alta)
interface PlacaApiResponse {
  // Campos principais (caixa alta)
  MARCA?: string;
  MODELO?: string;
  SUBMODELO?: string;
  VERSAO?: string;
  // Campos em caixa baixa
  placa?: string;
  ano?: string;
  anoModelo?: string;
  cor?: string;
  combustivel?: string;
  chassi?: string;
  renavam?: string;
  municipio?: string;
  uf?: string;
  situacao?: string;
  codigoSituacao?: string;
  // Estrutura FIPE aninhada
  fipe?: {
    dados?: Array<{
      ano_modelo?: string;
      codigo_fipe?: string;
      texto_valor?: string;
      valorVeiculo?: number;
      mes_referencia?: string;
      texto_marca?: string;
      texto_modelo?: string;
      combustivel?: string;
    }>;
  };
  // Error handling
  error?: boolean | string;
  message?: string;
  msg?: string;
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
  error?: string,
  origem: string = 'FIPE'
): StandardResponse {
  return {
    success,
    data,
    meta: {
      origem,
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

// Validação de placa brasileira
function validatePlaca(placa: string): boolean {
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  // Padrão antigo: 3 letras + 4 números
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return padraoAntigo.test(cleanPlaca) || padraoMercosul.test(cleanPlaca);
}

type PrimitiveStrNum = string | number;

function pickPrimitiveValue(obj: any, keys: string[]): PrimitiveStrNum | null {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) return t;
    }
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function deepFindPrimitiveByKeyContains(
  obj: any,
  matcher: (upperKey: string) => boolean,
  maxDepth: number = 2,
  currentDepth: number = 0,
  pathPrefix: string = ''
): { keyPath: string; value: PrimitiveStrNum } | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  for (const [key, value] of Object.entries(obj)) {
    const upperKey = key.toUpperCase();
    const keyPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (matcher(upperKey)) {
      if (typeof value === 'string') {
        const t = value.trim();
        if (t) return { keyPath, value: t };
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return { keyPath, value };
      }
    }

    if (currentDepth < maxDepth && value && typeof value === 'object' && !Array.isArray(value)) {
      const found = deepFindPrimitiveByKeyContains(value, matcher, maxDepth, currentDepth + 1, keyPath);
      if (found) return found;
    }
  }

  return null;
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

  // Dados de auditoria e verificações de rota
  const origem = req.headers.get('x-origem') || 'web';
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Identificar se é endpoint FIPE (marcas, modelos, anos, valor)
  const fipeIndex = pathParts.indexOf('fipe');
  const isFipeEndpoint = fipeIndex >= 0;
  
  // Permitir acesso público para FIPE quando vem da landing page
  const isPublicFipeRequest = isFipeEndpoint && origem === 'landing';
  
  // Exigir autenticação para endpoints protegidos (placa requer auth, FIPE da landing não)
  if (!userId && !isPublicFipeRequest) {
    console.error('[API] Requisição não autenticada rejeitada - origem:', origem);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Autenticação obrigatória. Faça login para continuar.',
        meta: { origem: 'API', consultadoEm: new Date().toISOString() }
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`[API] Request: ${url.pathname}, origem: ${origem}, userId: ${userId || 'public'}, isPublicFipe: ${isPublicFipeRequest}`);

  try {
    // Permite chamada via POST (supabase.functions.invoke) com JSON: { route: 'placa', placa: 'ABC1234' }
    let body: any = null;
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try {
          body = await req.json();
        } catch {
          body = null;
        }
      }
    }

    // Check if it's a placa endpoint
    const placaIndex = pathParts.indexOf('placa');
    const placaFromPath = placaIndex >= 0 && pathParts[placaIndex + 1] ? pathParts[placaIndex + 1] : null;
    const placaFromBody = typeof body?.placa === 'string' ? body.placa : null;
    const isPlacaEndpoint = (body?.route === 'placa' && !!placaFromBody) || !!placaFromPath;

    if (isPlacaEndpoint) {
      // ========== CONSULTA POR PLACA ==========
      const placa = (placaFromPath ?? placaFromBody ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

      console.log(`[PLACA API] Consultando placa: ${placa}, User: ${userEmail || 'anonymous'}`);

      // Validar formato da placa
      if (!validatePlaca(placa)) {
        return new Response(
          JSON.stringify(createStandardResponse(
            false,
            null,
            false,
            undefined,
            'Formato de placa inválido. Use AAA1234 (antigo) ou AAA1A23 (Mercosul)',
            'API_PLACAS'
          )),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obter API key
      const apiPlacasKey = Deno.env.get('API_PLACAS_KEY');
      if (!apiPlacasKey) {
        console.error('[PLACA API] API_PLACAS_KEY não configurada');
        return new Response(
          JSON.stringify(createStandardResponse(
            false,
            null,
            false,
            undefined,
            'Consulta por placa não disponível. Configure a API key.',
            'API_PLACAS'
          )),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Consultar API wdapi2 - GET com placa e token na URL
      const placaUrl = `${API_PLACAS_BASE}/consulta/${encodeURIComponent(placa)}/${apiPlacasKey}`;
      console.log(`[PLACA API] URL: ${API_PLACAS_BASE}/consulta/${placa}/***`);

      const response = await fetch(placaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const responseText = await response.text();
      const responseContentType = response.headers.get('content-type') || '';
      console.log(`[PLACA API] Status: ${response.status} (${responseContentType})`);

      // Se não for JSON, retorna erro legível (evita "Resposta inválida" genérica)
      const looksLikeHtml = responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');
      if (looksLikeHtml) {
        console.log('[PLACA API] HTML snippet:', responseText.slice(0, 200).replace(/\s+/g, ' ').trim());
      }

      if (!response.ok || !responseContentType.includes('application/json') || looksLikeHtml) {
        const errorMsg = looksLikeHtml
          ? `API de placas retornou HTML (status ${response.status}). Possível bloqueio/validação do provedor (Cloudflare) ou token inválido.`
          : `API de placas retornou status ${response.status}.`;

        console.error('[PLACA API] Erro HTTP/Conteúdo:', errorMsg);

        await supabase.from('fipe_logs').insert({
          user_id: userId,
          user_email: userEmail,
          endpoint: 'placa',
          parametros: { placa, status: response.status },
          ip_address: ipAddress,
          user_agent: userAgent,
          origem,
          sucesso: false,
          erro: errorMsg,
          cache_hit: false,
        });

        return new Response(
          JSON.stringify(createStandardResponse(false, null, false, undefined, errorMsg, 'API_PLACAS')),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let placaData: PlacaApiResponse;
      try {
        placaData = JSON.parse(responseText);
      } catch {
        const errorMsg = 'Não foi possível interpretar o JSON da API de placas.';
        console.error('[PLACA API] Parse JSON falhou:', responseText.slice(0, 500));

        await supabase.from('fipe_logs').insert({
          user_id: userId,
          user_email: userEmail,
          endpoint: 'placa',
          parametros: { placa, status: response.status },
          ip_address: ipAddress,
          user_agent: userAgent,
          origem,
          sucesso: false,
          erro: errorMsg,
          cache_hit: false,
        });

        return new Response(
          JSON.stringify(createStandardResponse(false, null, false, undefined, errorMsg, 'API_PLACAS')),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar erro na resposta
      if (placaData.error || placaData.message || placaData.msg) {
        const errorMsg = placaData.message || placaData.msg || (typeof placaData.error === 'string' ? placaData.error : 'Erro desconhecido');
        console.error(`[PLACA API] Erro: ${errorMsg}`);
        
        // Log de auditoria para erro
        await supabase.from('fipe_logs').insert({
          user_id: userId,
          user_email: userEmail,
          endpoint: 'placa',
          parametros: { placa },
          ip_address: ipAddress,
          user_agent: userAgent,
          origem,
          sucesso: false,
          erro: errorMsg,
          cache_hit: false,
        });

        return new Response(
          JSON.stringify(createStandardResponse(
            false,
            null,
            false,
            undefined,
            errorMsg,
            'API_PLACAS'
          )),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extrair marca/modelo (campos em caixa alta)
      const marca = placaData.MARCA || null;
      const modelo = placaData.MODELO || placaData.SUBMODELO || null;
      const versao = placaData.VERSAO || null;

      console.log(`[PLACA API] Veículo encontrado: ${marca} ${modelo}`);

      // Extrair ano de fabricação e modelo
      const anoFabricacao = placaData.ano ? parseInt(placaData.ano) : null;
      const anoModelo = placaData.anoModelo ? parseInt(placaData.anoModelo) : anoFabricacao;

      // Extrair dados FIPE da estrutura aninhada
      let valorFipe: number | null = null;
      let codigoFipe: string | null = null;
      let mesReferencia: string | null = null;
      
      if (placaData.fipe?.dados && placaData.fipe.dados.length > 0) {
        const fipeData = placaData.fipe.dados[0];
        codigoFipe = fipeData.codigo_fipe || null;
        mesReferencia = fipeData.mes_referencia || null;
        
        if (fipeData.texto_valor) {
          valorFipe = parseValorFipe(fipeData.texto_valor);
        } else if (fipeData.valorVeiculo) {
          valorFipe = fipeData.valorVeiculo;
        }
      }

      // Extrair chassi/renavam de forma resiliente (o provedor varia nomes/caixa)
      const chassiFromKnownKeys = pickPrimitiveValue(placaData, ['CHASSI', 'chassi', 'Chassi']);
      const renavamFromKnownKeys = pickPrimitiveValue(placaData, ['RENAVAM', 'renavam', 'Renavam', 'RENAVAN', 'renavan']);

      const chassiFromDeepKey = deepFindPrimitiveByKeyContains(
        placaData,
        (k) => k.includes('CHASSI')
      );
      const renavamFromDeepKey = deepFindPrimitiveByKeyContains(
        placaData,
        (k) => k.includes('RENAVAM') || k.includes('RENAVAN')
      );

      const chassiCompletoRaw = chassiFromKnownKeys ?? chassiFromDeepKey?.value ?? null;
      const renavamRaw = renavamFromKnownKeys ?? renavamFromDeepKey?.value ?? null;

      const chassiCompleto = chassiCompletoRaw != null ? String(chassiCompletoRaw).trim() : null;
      // Qualquer '*' indica mascaramento
      const chassiMascarado = !!(chassiCompleto && chassiCompleto.includes('*'));

      // Processar renavam - apenas números
      let renavamLimpo = renavamRaw != null ? String(renavamRaw).trim() : null;
      if (renavamLimpo) {
        renavamLimpo = renavamLimpo.replace(/\D/g, '') || null;
      }

      // Log sem expor dados completos
      console.log(
        `[PLACA API] Campos retornados: chassi=${chassiCompleto ? 'sim' : 'não'} (mascarado=${chassiMascarado})` +
          `, renavam=${renavamLimpo ? 'sim' : 'não'}` +
          (chassiFromDeepKey ? `, chassiKey=${chassiFromDeepKey.keyPath}` : '') +
          (renavamFromDeepKey ? `, renavamKey=${renavamFromDeepKey.keyPath}` : '')
      );

      const result = {
        placa: placaData.placa || placa,
        marca,
        modelo,
        versao,
        ano_fabricacao: anoFabricacao,
        ano_modelo: anoModelo,
        cor: placaData.cor || null,
        combustivel: placaData.combustivel || null,
        // Retornar chassi completo ou indicar que está mascarado
        chassi: chassiCompleto,
        chassi_mascarado: chassiMascarado,
        // Retornar renavam quando disponível
        renavam: renavamLimpo,
        municipio: placaData.municipio || null,
        uf: placaData.uf || null,
        situacao: placaData.situacao || null,
        codigo_fipe: codigoFipe,
        valor_fipe: valorFipe,
        mes_referencia: mesReferencia,
        fipeEncontrado: !!codigoFipe || !!valorFipe,
      };

      // Log de auditoria para sucesso
      await supabase.from('fipe_logs').insert({
        user_id: userId,
        user_email: userEmail,
        endpoint: 'placa',
        parametros: { placa, marca: result.marca, modelo: result.modelo },
        ip_address: ipAddress,
        user_agent: userAgent,
        origem,
        sucesso: true,
        cache_hit: false,
      });

      return new Response(
        JSON.stringify(createStandardResponse(true, result, false, undefined, undefined, 'API_PLACAS')),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ENDPOINTS FIPE ==========
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
              fipe: {
                marcas: 'GET /api/fipe/marcas?tipo=carro|moto|caminhao',
                modelos: 'GET /api/fipe/modelos?tipo=&marcaId=',
                anos: 'GET /api/fipe/anos?tipo=&marcaId=&modeloId=',
                valor: 'GET /api/fipe/valor?tipo=&marcaId=&modeloId=&anoId='
              },
              placa: 'GET /api/placa/{placa}'
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
    console.error('[API] Erro:', error);
    
    // Registrar log de erro
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const fipeIndex = pathParts.indexOf('fipe');
    const placaIndex = pathParts.indexOf('placa');
    const endpoint = placaIndex >= 0 ? 'placa' : (fipeIndex >= 0 && pathParts[fipeIndex + 1] ? pathParts[fipeIndex + 1] : 'unknown');
    
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
          placa: placaIndex >= 0 ? pathParts[placaIndex + 1] : null,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        origem,
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        cache_hit: false,
      });

    const origemResposta = endpoint === 'placa' ? 'API_PLACAS' : 'FIPE';

    return new Response(
      JSON.stringify(createStandardResponse(
        false,
        null,
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro desconhecido',
        origemResposta
      )),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
