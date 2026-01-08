import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTermoRequest {
  termoId: string;
  canal: 'email' | 'whatsapp' | 'ambos';
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

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { termoId, canal }: SendTermoRequest = await req.json();

    if (!termoId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do termo não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch termo with associado data
    const { data: termo, error: termoError } = await supabase
      .from("termos_aceite")
      .select(`
        *,
        associados!inner(
          nome_completo,
          email,
          whatsapp,
          telefone
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

    const associado = termo.associados;
    const signatureUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/assinatura-termo/${termo.token_assinatura}`;
    
    // Alternative: use the actual frontend URL
    const frontendUrl = Deno.env.get("FRONTEND_URL") || supabaseUrl.replace('sbtfhtllzpurjprivqoi.supabase.co', 'harmony-marka.lovable.app');
    const linkAssinatura = `${frontendUrl}/assinatura-termo/${termo.token_assinatura}`;

    const results: { email?: boolean; whatsapp?: string } = {};

    // Send email
    if ((canal === 'email' || canal === 'ambos') && associado.email && resendApiKey) {
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
              .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Harmony Clube de Benefícios</h1>
                <p>Termo de Aceite</p>
              </div>
              <div class="content">
                <p>Olá, <strong>${associado.nome_completo}</strong>!</p>
                <p>Segue seu Termo de Aceite do Harmony Clube de Benefícios.</p>
                <p>Por favor, assine para concluir sua filiação.</p>
                <center>
                  <a href="${linkAssinatura}" class="button">Assinar Termo</a>
                </center>
                <p style="font-size: 12px; color: #666;">
                  Ou copie e cole este link no navegador:<br>
                  <a href="${linkAssinatura}">${linkAssinatura}</a>
                </p>
                <p style="font-size: 12px; color: #666;">
                  Este link expira em 7 dias.
                </p>
              </div>
              <div class="footer">
                <p>Este e-mail foi enviado automaticamente. Por favor, não responda.</p>
                <p>© ${new Date().getFullYear()} Harmony Clube de Benefícios</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: "Harmony <noreply@resend.dev>",
          to: [associado.email],
          subject: "Assine seu Termo de Aceite - Harmony Clube de Benefícios",
          html: emailHtml,
        });

        results.email = true;
        console.log(`Email sent to ${associado.email}`);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        results.email = false;
      }
    }

    // Generate WhatsApp link
    if (canal === 'whatsapp' || canal === 'ambos') {
      const phoneNumber = associado.whatsapp || associado.telefone;
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        
        const message = encodeURIComponent(
          `Olá, ${associado.nome_completo}!\n\n` +
          `Segue seu Termo de Aceite do Harmony Clube de Benefícios.\n\n` +
          `Por favor, assine para concluir sua filiação:\n${linkAssinatura}\n\n` +
          `Este link expira em 7 dias.`
        );

        results.whatsapp = `https://wa.me/${formattedPhone}?text=${message}`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notificações processadas",
        results,
        linkAssinatura 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-termo-aceite:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
