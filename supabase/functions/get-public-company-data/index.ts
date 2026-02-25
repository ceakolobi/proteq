import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CompanyRow = {
  id: string;
  nome: string | null;
  logo: string | null;
  logo_branca: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cover_mode: string | null;
  cover_fixed_index: number | null;
  pdf_contracapa: string | null;
  texto_institucional: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
};

const mapCompanyToSettings = (company: CompanyRow) => ({
  empresa_nome: company.nome,
  empresa_logo: company.logo,
  empresa_logo_branca: company.logo_branca,
  cor_primaria: company.cor_primaria,
  cor_secundaria: company.cor_secundaria,
  cover_mode: company.cover_mode,
  cover_fixed_index: company.cover_fixed_index,
  pdf_contracapa: company.pdf_contracapa,
  texto_institucional: company.texto_institucional,
  telefone: company.telefone,
  email: company.email,
  site: company.site,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let company: CompanyRow | null = null;

    const { data: activeCompany, error: activeCompanyError } = await supabase
      .from("companies")
      .select("id, nome, logo, logo_branca, cor_primaria, cor_secundaria, cover_mode, cover_fixed_index, pdf_contracapa, texto_institucional, telefone, email, site")
      .eq("ativo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (activeCompanyError) {
      console.error("Active company error:", activeCompanyError);
    }

    company = (activeCompany as CompanyRow | null) ?? null;

    // Fallback: usa a primeira empresa quando não houver nenhuma ativa
    if (!company) {
      const { data: fallbackCompany, error: fallbackCompanyError } = await supabase
        .from("companies")
        .select("id, nome, logo, logo_branca, cor_primaria, cor_secundaria, cover_mode, cover_fixed_index, pdf_contracapa, texto_institucional, telefone, email, site")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackCompanyError) {
        console.error("Fallback company error:", fallbackCompanyError);
      }

      company = (fallbackCompany as CompanyRow | null) ?? null;
    }

    let settings: Record<string, unknown> = {};
    const companyId = company?.id ?? null;

    if (company) {
      settings = mapCompanyToSettings(company);
    } else {
      // Fallback legado
      const { data: legacySettings, error: settingsError } = await supabase
        .from("settings")
        .select(
          "empresa_nome, empresa_logo, empresa_logo_branca, cor_primaria, cor_secundaria, cover_1, cover_2, cover_mode, cover_fixed_index, pdf_contracapa, texto_institucional, telefone, email, site"
        )
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error("Settings error:", settingsError);
      }

      settings = legacySettings || {};
    }

    // Fetch company covers
    let coversQuery = supabase
      .from("company_covers")
      .select("id, public_url")
      .order("created_at", { ascending: false });

    if (companyId) {
      coversQuery = coversQuery.eq("company_id", companyId);
    }

    const { data: covers, error: coversError } = await coversQuery;

    if (coversError) {
      console.error("Covers error:", coversError);
    }

    // Fetch active contract template
    let templateQuery = supabase
      .from("document_templates")
      .select("content_markdown, title")
      .eq("is_active", true)
      .eq("template_key", "default_contract")
      .limit(1);

    if (companyId) {
      templateQuery = templateQuery.eq("company_id", companyId);
    }

    const { data: template, error: templateError } = await templateQuery.maybeSingle();

    if (templateError) {
      console.error("Template error:", templateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          companyId,
          settings,
          covers: covers || [],
          contractTemplate: template?.content_markdown || null,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
