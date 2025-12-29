import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  clienteNome: string;
  modelo: string;
  mensalidade: string;
  validadeDias: number;
  pdfUrl: string;
  pdfBase64?: string;
  filename: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      clienteNome, 
      modelo, 
      mensalidade, 
      validadeDias, 
      pdfUrl, 
      pdfBase64,
      filename 
    }: EmailRequest = await req.json();

    console.log("Enviando e-mail para:", to);
    console.log("Cliente:", clienteNome);
    console.log("Modelo:", modelo);

    if (!to) {
      return new Response(
        JSON.stringify({ error: "E-mail do destinatário é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316 0%, #22c55e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .beneficios { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .beneficio { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .beneficio:last-child { border-bottom: none; }
    .beneficio::before { content: "✔️"; margin-right: 10px; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .validade { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Proposta de Cotação</h1>
      <p>Proteção Veicular • Harmony Agro</p>
    </div>
    
    <div class="content">
      <p>Olá${clienteNome ? ` <strong>${clienteNome}</strong>` : ""}! 👋</p>
      
      <p>Preparamos uma proposta especial de proteção veicular para o seu <strong>${modelo || "veículo"}</strong>.</p>
      
      <div class="beneficios">
        <h3 style="margin-top: 0; color: #22c55e;">Benefícios Inclusos:</h3>
        <div class="beneficio">Roubo e Furto 100% FIPE</div>
        <div class="beneficio">Fenômenos da Natureza</div>
        <div class="beneficio">Cobertura para Terceiros</div>
        <div class="beneficio">Incêndio</div>
        <div class="beneficio">Guincho 24h</div>
        <div class="beneficio">Assistência 24h</div>
        <div class="beneficio">Carro Reserva</div>
      </div>
      
      ${mensalidade ? `<p style="text-align: center; font-size: 18px;">💰 <strong>Mensalidade: ${mensalidade}</strong></p>` : ""}
      
      <div class="validade">
        ⏳ <strong>Validade da proposta:</strong> ${validadeDias} dias
      </div>
      
      ${pdfUrl ? `
      <div class="cta">
        <a href="${pdfUrl}" class="btn">📄 Ver Proposta Completa (PDF)</a>
      </div>
      ` : ""}
      
      <p>Qualquer dúvida, estamos à disposição!</p>
      
      <p>🤝 Conte com a gente!</p>
    </div>
    
    <div class="footer">
      <p><strong>Harmony Agro</strong> - Proteção Veicular</p>
      <p>Protegendo o que é seu com transparência e confiança.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailOptions: any = {
      from: "Harmony Agro <onboarding@resend.dev>",
      to: [to],
      subject: "Proposta de Cotação – Harmony Agro",
      html: htmlContent,
    };

    // Se tiver PDF em base64, anexar
    if (pdfBase64) {
      emailOptions.attachments = [
        {
          filename: filename || "Proposta_HarmonyAgro.pdf",
          content: pdfBase64,
        },
      ];
    }

    const emailResponse = await resend.emails.send(emailOptions);

    console.log("E-mail enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
