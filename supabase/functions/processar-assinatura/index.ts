import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessarAssinaturaRequest {
  termoId: string;
  assinaturaNome: string;
  assinaturaCpf: string;
  assinaturaData: string; // base64 da assinatura ou "codigo:XXXXXX"
  canalAssinatura: 'app' | 'whatsapp' | 'link';
  userAgent?: string;
  ipAddress?: string;
  dispositivo?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessarAssinaturaRequest = await req.json();
    const { termoId, assinaturaNome, assinaturaCpf, assinaturaData, canalAssinatura, userAgent, ipAddress, dispositivo } = body;

    if (!termoId || !assinaturaNome || !assinaturaCpf) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos para assinatura" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch termo with associado and veiculo data
    const { data: termo, error: termoError } = await supabase
      .from("termos_aceite")
      .select(`
        *,
        associados!inner(
          id,
          nome_completo,
          cpf,
          email,
          telefone,
          whatsapp,
          company_id
        ),
        veiculos(
          id,
          placa,
          marca,
          modelo,
          ano
        )
      `)
      .eq("id", termoId)
      .single();

    if (termoError || !termo) {
      return new Response(
        JSON.stringify({ success: false, error: "Termo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se já foi assinado
    if (termo.status === 'assinado') {
      return new Response(
        JSON.stringify({ success: false, error: "Este termo já foi assinado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se expirou
    if (new Date(termo.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Este termo expirou. Solicite um novo link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agora = new Date().toISOString();
    const dataHoraFormatada = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 1. Atualizar o termo com dados da assinatura
    const { error: updateError } = await supabase
      .from("termos_aceite")
      .update({
        assinatura_nome: assinaturaNome,
        assinatura_cpf: assinaturaCpf.replace(/\D/g, ''),
        assinatura_data: assinaturaData,
        assinado_em: agora,
        status: 'assinado',
        canal_aceite: canalAssinatura,
        user_agent_aceite: userAgent || null,
        ip_aceite: ipAddress || null,
        data_hora_aceite: agora,
      })
      .eq("id", termoId);

    if (updateError) {
      console.error("Error updating termo:", updateError);
      throw new Error("Erro ao registrar assinatura");
    }

    // 2. Atualizar status do associado para ATIVO
    const { error: associadoError } = await supabase
      .from("associados")
      .update({
        termos_aceitos: true,
        termos_aceitos_em: agora,
        status: 'ativo',
      })
      .eq("id", termo.associado_id);

    if (associadoError) {
      console.error("Error updating associado:", associadoError);
    }

    // 3. Registrar log de acesso/auditoria
    try {
      await supabase.from("audit_logs").insert({
        acao: 'ASSINATURA_TERMO',
        tabela: 'termos_aceite',
        registro_id: termoId,
        dados_novos: {
          assinatura_nome: assinaturaNome,
          canal_assinatura: canalAssinatura,
          data_hora: dataHoraFormatada,
          user_agent: userAgent,
          ip_address: ipAddress,
          dispositivo: dispositivo,
        },
      });
    } catch (logError) {
      console.error("Error creating audit log:", logError);
      // Não bloquear por erro no log
    }

    const associado = termo.associados;
    const primeiroNome = associado.nome_completo.split(' ')[0];

    // 4. Enviar confirmação via WhatsApp (gerar link)
    let whatsappConfirmacao = null;
    const phoneNumber = associado.whatsapp || associado.telefone;
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      const mensagemConfirmacao = encodeURIComponent(
        `✅ Pronto, ${primeiroNome}!\n\n` +
        `Seu termo foi assinado com sucesso e seu cadastro já está ativo.\n\n` +
        `Bem-vindo ao *Harmony Clube de Benefícios*! 🎉\n\n` +
        `Em caso de dúvidas, estamos à disposição.`
      );

      whatsappConfirmacao = `https://wa.me/${formattedPhone}?text=${mensagemConfirmacao}`;
    }

    // 5. Enviar e-mail de confirmação
    let emailEnviado = false;
    if (associado.email && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 48px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .info-box { background: white; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Termo Assinado!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${primeiroNome}</strong>!</p>
                <p>Seu termo foi assinado com sucesso e seu cadastro já está <strong>ATIVO</strong>.</p>
                
                <div class="info-box">
                  <strong>Dados da Assinatura:</strong><br>
                  📅 Data: ${dataHoraFormatada}<br>
                  📝 Documento: Termo de Aceite<br>
                  ✅ Status: Assinado
                </div>
                
                <p>Bem-vindo ao <strong>Harmony Clube de Benefícios</strong>! 🎉</p>
                <p>Em caso de dúvidas, estamos à disposição.</p>
              </div>
              <div class="footer">
                <p>Este documento tem validade jurídica conforme Lei nº 14.063/2020.</p>
                <p>© ${new Date().getFullYear()} Harmony Clube de Benefícios</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: "Harmony <noreply@resend.dev>",
          to: [associado.email],
          subject: "✅ Termo Assinado - Harmony Clube de Benefícios",
          html: emailHtml,
        });

        emailEnviado = true;
        console.log(`Confirmation email sent to ${associado.email}`);
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Assinatura processada com sucesso",
        data: {
          termoId,
          status: 'assinado',
          dataHoraAssinatura: dataHoraFormatada,
          associadoStatus: 'ativo',
          emailEnviado,
          whatsappConfirmacao,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in processar-assinatura:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
