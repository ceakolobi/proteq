import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar autenticação do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ success: false, error: "Não autorizado" });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) return ok({ success: false, error: "Token inválido" });

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

    if (!isAdmin) return ok({ success: false, error: "Acesso negado" });

    const { userId, novoEmail } = await req.json();

    if (!userId || !novoEmail) {
      return ok({ success: false, error: "userId e novoEmail são obrigatórios" });
    }

    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoEmail.trim())) {
      return ok({ success: false, error: "Formato de e-mail inválido" });
    }

    const emailNormalizado = novoEmail.trim().toLowerCase();

    // Proteção: admin não-principal não pode alterar e-mail de outro admin
    const isCallerAdminPrincipal = callerProfile?.is_admin_principal === true;
    if (!isCallerAdminPrincipal) {
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("is_admin_principal")
        .eq("id", userId)
        .single();

      const { data: targetRoles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const adminRolesSet = ["admin_principal", "admin_regional", "admin_nivel_basico"];
      const targetIsAdmin =
        targetProfile?.is_admin_principal === true ||
        targetRoles?.some((r: { role: string }) => adminRolesSet.includes(r.role));

      if (targetIsAdmin) {
        return ok({ success: false, error: "Você não tem permissão para alterar o e-mail de um administrador" });
      }
    }

    // Verificar se e-mail já está em uso (via profiles — rápido e indexado)
    const { data: emailExistente } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("email", emailNormalizado)
      .neq("id", userId)
      .maybeSingle();

    if (emailExistente) {
      return ok({ success: false, error: "Este e-mail já está em uso por outro usuário" });
    }

    // Atualizar e-mail no auth.users via admin API
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      email: emailNormalizado,
    });

    if (authUpdateError) {
      console.error("[admin-alterar-email] updateUserById error:", authUpdateError.message);
      if (authUpdateError.message?.toLowerCase().includes("already")) {
        return ok({ success: false, error: "Este e-mail já está em uso por outro usuário" });
      }
      return ok({ success: false, error: `Erro ao atualizar e-mail: ${authUpdateError.message}` });
    }

    // Sincronizar profiles.email
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ email: emailNormalizado })
      .eq("id", userId);

    if (profileError) {
      console.error("[admin-alterar-email] profile sync error:", profileError.message);
    }

    return ok({ success: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[admin-alterar-email] unhandled error:", msg);
    return ok({ success: false, error: msg });
  }
});
