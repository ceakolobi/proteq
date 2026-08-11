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

    // Apenas admin_principal pode excluir permanentemente
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("is_admin_principal")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.is_admin_principal !== true) {
      return ok({ success: false, error: "Apenas o Admin Principal pode excluir usuários permanentemente" });
    }

    const { userId } = await req.json();
    if (!userId) return ok({ success: false, error: "userId é obrigatório" });

    // Não permitir auto-exclusão
    if (userId === caller.id) {
      return ok({ success: false, error: "Você não pode excluir a própria conta" });
    }

    // Não permitir excluir outro admin_principal
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("is_admin_principal, email")
      .eq("id", userId)
      .single();

    if (targetProfile?.is_admin_principal === true) {
      return ok({ success: false, error: "Não é possível excluir outro Admin Principal" });
    }

    // Hard delete via auth admin API — cascata no banco se FK configurada
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("[admin-deletar-usuario] deleteUser error:", deleteError.message);
      if (deleteError.message?.toLowerCase().includes("foreign key") ||
          deleteError.message?.toLowerCase().includes("violates") ||
          deleteError.message?.toLowerCase().includes("constraint")) {
        return ok({
          success: false,
          error: "Este usuário possui dados vinculados no sistema (associados, cotações etc.) e não pode ser excluído permanentemente. Desative-o em vez de excluir.",
        });
      }
      return ok({ success: false, error: `Erro ao excluir: ${deleteError.message}` });
    }

    // Garantir remoção do profile caso não haja CASCADE no banco
    await adminClient.from("profiles").delete().eq("id", userId);

    return ok({ success: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[admin-deletar-usuario] unhandled error:", msg);
    return ok({ success: false, error: msg });
  }
});
