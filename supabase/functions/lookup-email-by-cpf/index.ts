import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LookupResponse = {
  email: string | null;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ email: null } satisfies LookupResponse), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ email: null } satisfies LookupResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let cpfRaw: string | null = null;
  try {
    const body = await req.json();
    cpfRaw = typeof body?.cpf === "string" ? body.cpf : null;
  } catch {
    cpfRaw = null;
  }

  const cpf = (cpfRaw ?? "").replace(/\D/g, "").slice(0, 11);
  if (cpf.length !== 11) {
    return new Response(JSON.stringify({ email: null } satisfies LookupResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email, ativo")
    .eq("cpf", cpf)
    .maybeSingle();

  if (error || !data?.email || data.ativo === false) {
    return new Response(JSON.stringify({ email: null } satisfies LookupResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return new Response(JSON.stringify({ email: data.email } satisfies LookupResponse), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
