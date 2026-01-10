import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateConsultorRequest {
  nome_completo: string;
  email: string;
  telefone?: string;
  cpf?: string;
  regiao_id: string;
  sede_id: string;
  company_id: string;
}

// Generate a secure temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "API de e-mail não configurada" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller has permission
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if caller has permission (admin_principal or admin_regional)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin_principal')
      .eq('id', caller.id)
      .single();

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const isAdminPrincipal = callerProfile?.is_admin_principal === true;
    const isAdminRegional = callerRoles?.some(r => r.role === 'admin_regional');
    const isGerente = callerRoles?.some(r => r.role === 'gerente');

    if (!isAdminPrincipal && !isAdminRegional && !isGerente) {
      return new Response(
        JSON.stringify({ success: false, error: "Sem permissão para criar consultores" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const requestBody: CreateConsultorRequest = await req.json();
    const { nome_completo, email, telefone, cpf, regiao_id, sede_id, company_id } = requestBody;

    console.log("=== Criando consultor ===");
    console.log("Email:", email);
    console.log("Nome:", nome_completo);

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Já existe um usuário com este e-mail. Use a opção de vincular usuário existente.",
          code: "USER_EXISTS"
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    console.log("Senha temporária gerada");

    // Create user in auth.users
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        nome_completo: nome_completo.trim(),
        company_id: company_id,
      },
    });

    if (createUserError) {
      console.error("Erro ao criar usuário:", createUserError);
      
      let errorMessage = "Erro ao criar usuário";
      if (createUserError.message.includes("already registered")) {
        errorMessage = "Este e-mail já está registrado no sistema";
      } else if (createUserError.message.includes("invalid")) {
        errorMessage = "E-mail inválido";
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao criar usuário" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = authUser.user.id;
    console.log("Usuário criado:", userId);

    // Update profile with additional data and set must_change_password
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome_completo: nome_completo.trim(),
        telefone: telefone?.trim() || null,
        cpf: cpf?.replace(/\D/g, '') || null,
        regiao_id: regiao_id,
        sede_id: sede_id,
        company_id: company_id,
        must_change_password: true, // Force password change on first login
        ativo: true,
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
      // Try to delete the created user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao configurar perfil do consultor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Add consultor_vendas role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'consultor_vendas',
      });

    if (roleError) {
      console.error("Erro ao adicionar role:", roleError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao configurar permissões do consultor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Role consultor_vendas adicionada");

    // Get company info for email
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('nome')
      .eq('id', company_id)
      .single();

    const empresaNome = companyData?.nome || "Harmony Clube de Benefícios";

    // Send welcome email with credentials
    const resend = new Resend(resendApiKey);

    const systemUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') 
      || "https://sbtfhtllzpurjprivqoi.lovable.app";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #F97316; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px; }
    .content { padding: 30px; }
    .welcome { font-size: 18px; color: #1E293B; margin-bottom: 20px; }
    .credentials { background: #FEF3C7; border: 2px solid #F97316; border-radius: 8px; padding: 25px; margin: 25px 0; }
    .credentials h3 { margin: 0 0 15px 0; color: #1E293B; font-size: 16px; }
    .credential-item { display: flex; padding: 10px 0; border-bottom: 1px solid #FDE68A; }
    .credential-item:last-child { border-bottom: none; }
    .credential-label { font-weight: bold; color: #92400E; width: 80px; }
    .credential-value { color: #1E293B; font-family: monospace; font-size: 15px; word-break: break-all; }
    .warning { background: #FEE2E2; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #EF4444; }
    .warning p { margin: 0; color: #991B1B; font-size: 14px; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: #F97316; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; padding: 20px; background: #F8FAFC; color: #64748B; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo(a) à Equipe!</h1>
      <p>${empresaNome} • Sistema de Gestão</p>
    </div>
    
    <div class="content">
      <p class="welcome">Olá <strong>${nome_completo}</strong>!</p>
      
      <p>Você foi cadastrado(a) como <strong>Consultor(a) de Vendas</strong> em nosso sistema. Abaixo estão suas credenciais de acesso:</p>
      
      <div class="credentials">
        <h3>🔐 Suas Credenciais de Acesso:</h3>
        <div class="credential-item">
          <span class="credential-label">Login:</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Senha:</span>
          <span class="credential-value">${tempPassword}</span>
        </div>
      </div>
      
      <div class="warning">
        <p>⚠️ <strong>Importante:</strong> No primeiro acesso, você será obrigado(a) a criar uma nova senha pessoal. A senha temporária acima será inválida após a troca.</p>
      </div>
      
      <div class="cta">
        <a href="${systemUrl}/auth" class="btn">🚀 Acessar o Sistema</a>
      </div>
      
      <p>Após fazer login, você terá acesso ao seu <strong>Painel do Consultor</strong>, onde poderá:</p>
      <ul>
        <li>✅ Cadastrar e acompanhar seus leads</li>
        <li>✅ Criar cotações para clientes</li>
        <li>✅ Gerenciar seus associados</li>
        <li>✅ Acompanhar suas metas e resultados</li>
      </ul>
      
      <p>Qualquer dúvida, entre em contato com seu gestor regional.</p>
      
      <p>Boas vendas! 🤝</p>
    </div>
    
    <div class="footer">
      <p><strong>${empresaNome}</strong></p>
      <p>Este e-mail foi enviado automaticamente. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const emailResponse = await resend.emails.send({
        from: `${empresaNome} <noreply@resend.dev>`,
        to: [email],
        subject: `Bem-vindo(a) ao ${empresaNome} - Suas Credenciais de Acesso`,
        html: htmlContent,
      });

      if (emailResponse.error) {
        console.error("Erro ao enviar e-mail:", emailResponse.error);
        // Don't fail the whole operation if email fails
        // User was created successfully
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: userId,
            emailSent: false,
            message: "Consultor criado com sucesso, mas houve erro ao enviar o e-mail. Informe a senha manualmente.",
            tempPassword: tempPassword // Return password so admin can inform manually
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("E-mail enviado com sucesso:", emailResponse.data?.id);
    } catch (emailError) {
      console.error("Exceção ao enviar e-mail:", emailError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: userId,
          emailSent: false,
          message: "Consultor criado com sucesso, mas houve erro ao enviar o e-mail. Informe a senha manualmente.",
          tempPassword: tempPassword
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        emailSent: true,
        message: "Consultor criado com sucesso! E-mail com credenciais enviado."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
