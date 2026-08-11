import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sempre retorna 200 — erros chegam como { success: false, error: "..." }
// Isso evita FunctionsHttpError no cliente e permite extrair a mensagem real.
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
    const appUrl = (Deno.env.get("APP_URL") ?? "http://localhost:5173").replace(/\/$/, "");

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

    const { userId, modo } = await req.json();

    if (!userId || !modo) {
      return ok({ success: false, error: "userId e modo são obrigatórios" });
    }

    // Proteção: admin não-principal não pode resetar senha de outro admin
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
        return ok({ success: false, error: "Você não tem permissão para alterar a senha de um administrador" });
      }
    }

    // Buscar e-mail real de auth.users — profiles.email pode estar desatualizado
    const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
    if (authUserError || !authUser?.user?.email) {
      return ok({ success: false, error: `Usuário não encontrado em auth.users: ${authUserError?.message ?? 'e-mail ausente'}` });
    }
    const emailReal = authUser.user.email;

    // MODO 1: enviar link de recuperação/definição de senha por e-mail
    if (modo === "link") {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: emailReal,
        options: { redirectTo: `${appUrl}/definir-senha` },
      });

      if (error) {
        console.error("[admin-criar-acesso] generateLink error:", error.message, error);
        return ok({ success: false, error: `generateLink falhou: ${error.message}` });
      }

      return ok({ success: true, link: data.properties?.action_link });
    }

    // MODO 2: gerar senha provisória e marcar flag no perfil
    if (modo === "senha_provisoria") {
      const numero = Math.floor(1000 + Math.random() * 9000);
      const senhaGerada = `Harmony#${numero}`;

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: senhaGerada,
      });

      if (authUpdateError) {
        console.error("[admin-criar-acesso] updateUserById error:", authUpdateError.message);
        return ok({ success: false, error: `Erro ao atualizar senha: ${authUpdateError.message}` });
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ senha_provisoria: true })
        .eq("id", userId);

      if (profileError) {
        console.error("[admin-criar-acesso] profile update error:", profileError.message);
        return ok({ success: false, error: `Erro ao marcar perfil: ${profileError.message}` });
      }

      // Senha retornada UMA vez apenas — não é persistida em nenhuma tabela
      return ok({ success: true, senha: senhaGerada });
    }

    return ok({ success: false, error: "modo inválido. Use 'link' ou 'senha_provisoria'" });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[admin-criar-acesso] unhandled error:", msg);
    return ok({ success: false, error: msg });
  }
});
