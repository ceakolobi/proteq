import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin principal
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin_principal')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.is_admin_principal) {
      return new Response(
        JSON.stringify({ success: false, error: "Apenas Admin Principal pode excluir usuários" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get target user id from body
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent deleting self or another admin principal
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Não é possível excluir a si mesmo" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin_principal, nome_completo')
      .eq('id', user_id)
      .single();

    if (targetProfile?.is_admin_principal) {
      return new Response(
        JSON.stringify({ success: false, error: "Não é possível excluir um Admin Principal" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Deleting user ${user_id} (${targetProfile?.nome_completo})`);

    // Clean up related data before deleting from auth
    // 1. Delete user_permissions
    await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
    
    // 2. Delete user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);

    // 3. Delete the profile (will be cascade-deleted by auth, but just in case)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id);

    // 4. Delete from auth.users (this is the definitive deletion)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User ${user_id} deleted successfully`);

    return new Response(
      JSON.stringify({ success: true, message: "Usuário excluído permanentemente" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
