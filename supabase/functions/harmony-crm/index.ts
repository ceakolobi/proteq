import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HarmonyCRMResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface VeiculoData {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  ano_modelo?: number;
  tipo: string;
  valor_fipe?: number;
  codigo_fipe?: string;
  cor?: string;
  combustivel?: string;
  chassi?: string;
  renavam?: string;
}

interface CotacaoPayload {
  placa?: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo?: number;
  tipo_bem: string;
  valor_fipe: number;
  valor_bem: number;
  mensalidade: number;
  participacao: number;
  cota_id?: string;
  cota_nome?: string;
  consultor_id: string;
  consultor_nome?: string;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_whatsapp?: string;
  observacoes?: string;
}

interface ConsultorPerfil {
  id: string;
  nome: string;
  email: string;
  roles: string[];
  regiao_id?: string;
  sede_id?: string;
  company_id?: string;
  ativo: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API credentials from secrets
    const HARMONY_CRM_API_URL = Deno.env.get("HARMONY_CRM_API_URL");
    const HARMONY_CRM_API_KEY = Deno.env.get("HARMONY_CRM_API_KEY");

    if (!HARMONY_CRM_API_URL || !HARMONY_CRM_API_KEY) {
      console.error("Missing Harmony CRM credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração do CRM ausente" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client for authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const route = pathParts[pathParts.length - 1] || "";
    
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      body = await req.json();
    }

    // Get route from body if POST without path
    const action = body.route as string || route;
    
    console.log(`[Harmony CRM] Action: ${action}, User: ${user.email}`);

    // Route handlers
    switch (action) {
      case "veiculos":
      case "veiculo": {
        // GET /veiculos/placa/{placa}
        const placa = (body.placa as string || url.searchParams.get("placa") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        
        if (!placa || placa.length < 7) {
          return new Response(
            JSON.stringify({ success: false, error: "Placa inválida" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Harmony CRM] Fetching vehicle: ${placa}`);

        const veiculoResponse = await fetch(
          `${HARMONY_CRM_API_URL}/veiculos/placa/${placa}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": HARMONY_CRM_API_KEY,
              "Accept": "application/json",
            },
          }
        );

        if (!veiculoResponse.ok) {
          const errorText = await veiculoResponse.text();
          console.error(`[Harmony CRM] Vehicle fetch error: ${veiculoResponse.status} - ${errorText}`);
          
          if (veiculoResponse.status === 404) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Veículo não encontrado no CRM" 
              }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Erro ao consultar CRM: ${veiculoResponse.status}` 
            }),
            { status: veiculoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const veiculoData = await veiculoResponse.json() as HarmonyCRMResponse<VeiculoData>;
        console.log(`[Harmony CRM] Vehicle found:`, veiculoData);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: veiculoData.data || veiculoData 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cotacoes":
      case "cotacao": {
        // POST /cotacoes
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ success: false, error: "Método não permitido" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const cotacaoPayload = body.cotacao as CotacaoPayload;
        if (!cotacaoPayload) {
          return new Response(
            JSON.stringify({ success: false, error: "Dados da cotação não fornecidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Harmony CRM] Sending cotacao:`, cotacaoPayload);

        const cotacaoResponse = await fetch(
          `${HARMONY_CRM_API_URL}/cotacoes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": HARMONY_CRM_API_KEY,
              "Accept": "application/json",
            },
            body: JSON.stringify(cotacaoPayload),
          }
        );

        if (!cotacaoResponse.ok) {
          const errorText = await cotacaoResponse.text();
          console.error(`[Harmony CRM] Cotacao error: ${cotacaoResponse.status} - ${errorText}`);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Erro ao enviar cotação: ${cotacaoResponse.status}` 
            }),
            { status: cotacaoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const cotacaoResult = await cotacaoResponse.json() as HarmonyCRMResponse;
        console.log(`[Harmony CRM] Cotacao sent:`, cotacaoResult);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: cotacaoResult.data || cotacaoResult,
            message: "Cotação enviada com sucesso" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "consultores":
      case "consultor":
      case "perfil": {
        // GET /consultores/perfil
        console.log(`[Harmony CRM] Fetching consultant profile for: ${user.email}`);

        const perfilResponse = await fetch(
          `${HARMONY_CRM_API_URL}/consultores/perfil`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": HARMONY_CRM_API_KEY,
              "X-User-Email": user.email || "",
              "X-User-Id": user.id,
              "Accept": "application/json",
            },
          }
        );

        if (!perfilResponse.ok) {
          const errorText = await perfilResponse.text();
          console.error(`[Harmony CRM] Profile error: ${perfilResponse.status} - ${errorText}`);
          
          if (perfilResponse.status === 404) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Perfil não encontrado no CRM" 
              }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Erro ao buscar perfil: ${perfilResponse.status}` 
            }),
            { status: perfilResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const perfilData = await perfilResponse.json() as HarmonyCRMResponse<ConsultorPerfil>;
        console.log(`[Harmony CRM] Profile found:`, perfilData);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: perfilData.data || perfilData 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "health":
      case "status": {
        // Health check
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Harmony CRM integration active",
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Rota não encontrada: ${action}` 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[Harmony CRM] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
