import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar autenticação do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se chamador tem role de admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("is_admin_principal")
      .eq("id", caller.id)
      .single();

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const rolesAdmin = ["admin_principal", "admin_regional", "admin_nivel_basico"];
    const isAdmin =
      callerProfile?.is_admin_principal === true ||
      callerRoles?.some((r: { role: string }) => rolesAdmin.includes(r.role));

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, email, modo } = await req.json();

    if (!userId || !email || !modo) {
      return new Response(JSON.stringify({ error: "userId, email e modo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODO 1: enviar link de recuperação/definição de senha por e-mail
    if (modo === "link") {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${appUrl}/definir-senha` },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, link: data.properties?.action_link }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // MODO 2: gerar senha provisória e marcar flag no perfil
    if (modo === "senha_provisoria") {
      const numero = Math.floor(1000 + Math.random() * 9000);
      const senhaGerada = `Harmony#${numero}`;

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: senhaGerada,
      });

      if (authUpdateError) {
        return new Response(JSON.stringify({ error: authUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ senha_provisoria: true })
        .eq("id", userId);

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Senha retornada UMA vez apenas — não é persistida em nenhuma tabela
      return new Response(
        JSON.stringify({ success: true, senha: senhaGerada }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "modo inválido. Use 'link' ou 'senha_provisoria'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
