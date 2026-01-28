import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  nome: string;
  email: string;
  telefone: string;
  assunto: string;
  mensagem: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de e-mail não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(apiKey);
    const { nome, email, telefone, assunto, mensagem }: ContactRequest = await req.json();

    // Validate inputs
    if (!nome || !email || !assunto || !mensagem) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios não preenchidos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Enviando e-mail de contato:", { nome, email, assunto });

    const emailResponse = await resend.emails.send({
      from: "Harmony Agro <noreply@resend.dev>",
      to: ["contato@harmonyagro.com.br"],
      reply_to: email,
      subject: `[${assunto}] Nova mensagem de ${nome}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #22c55e 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 20px; }
            .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #374151; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 5px; border: 1px solid #e5e7eb; }
            .message-box { white-space: pre-wrap; }
            .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; background: #f3f4f6; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 Nova Mensagem de Contato</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Assunto:</div>
                <div class="value">${assunto}</div>
              </div>
              <div class="field">
                <div class="label">Nome:</div>
                <div class="value">${nome}</div>
              </div>
              <div class="field">
                <div class="label">E-mail:</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              <div class="field">
                <div class="label">Telefone:</div>
                <div class="value">${telefone || "Não informado"}</div>
              </div>
              <div class="field">
                <div class="label">Mensagem:</div>
                <div class="value message-box">${mensagem}</div>
              </div>
            </div>
            <div class="footer">
              <p>Mensagem enviada através do site Harmony Agro</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Erro do Resend:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao enviar e-mail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("E-mail de contato enviado com sucesso:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ success: true, message: "E-mail enviado com sucesso!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro inesperado" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
