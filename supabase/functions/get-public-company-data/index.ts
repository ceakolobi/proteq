import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select(
        "empresa_nome, empresa_logo, empresa_logo_branca, cor_primaria, cor_secundaria, cover_1, cover_2, cover_mode, cover_fixed_index, pdf_contracapa, texto_institucional, telefone, email, site"
      )
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings error:", settingsError);
    }

    // Fetch company covers
    const { data: covers, error: coversError } = await supabase
      .from("company_covers")
      .select("id, public_url")
      .order("created_at", { ascending: false });

    if (coversError) {
      console.error("Covers error:", coversError);
    }

    // Fetch active contract template
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("content_markdown, title")
      .eq("is_active", true)
      .eq("template_key", "default_contract")
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.error("Template error:", templateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          settings: settings || {},
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
