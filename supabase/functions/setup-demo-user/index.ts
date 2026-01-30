import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_COMPANY_ID = 'b0000000-0000-0000-0000-000000000002';
const DEMO_SEDE_ID = 'c0000000-0000-0000-0000-000000000003';
const DEMO_REGIAO_ID = 'd0000000-0000-0000-0000-000000000004';
const DEMO_EMAIL = 'demo@protecaodemo.com.br';
const DEMO_PASSWORD = 'Demo@2024!';

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

    // Verify caller is admin
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
        JSON.stringify({ success: false, error: "Apenas Admin Principal pode criar usuário demo" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("=== Configurando usuário DEMO ===");

    // Check if demo user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find(u => u.email === DEMO_EMAIL);

    let userId: string;

    if (existingDemo) {
      console.log("Usuário demo já existe, atualizando...");
      userId = existingDemo.id;
      
      // Reset password
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    } else {
      console.log("Criando novo usuário demo...");
      
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          nome_completo: 'Administrador Demo',
          company_id: DEMO_COMPANY_ID,
        },
      });

      if (createError || !authUser.user) {
        console.error("Erro ao criar usuário:", createError);
        return new Response(
          JSON.stringify({ success: false, error: createError?.message || "Erro ao criar usuário" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = authUser.user.id;
    }

    console.log("User ID:", userId);

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome_completo: 'Administrador Demo',
        company_id: DEMO_COMPANY_ID,
        sede_id: DEMO_SEDE_ID,
        regiao_id: DEMO_REGIAO_ID,
        is_admin_principal: false,
        must_change_password: false,
        ativo: true,
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
    }

    // Add roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    
    const { error: roleError1 } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin_demo' });

    const { error: roleError2 } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin_nivel_basico' });

    if (roleError1 || roleError2) {
      console.error("Erro ao adicionar roles:", roleError1, roleError2);
    }

    console.log("Usuário demo configurado com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Usuário demo configurado com sucesso!",
        credentials: {
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          url: `${supabaseUrl.replace('.supabase.co', '')}/auth`
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
