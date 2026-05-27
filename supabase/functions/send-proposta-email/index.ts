import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  empresaNome?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorType: 'api_key' | 'remetente' | 'pdf' | 'destinatario' | 'desconhecido';
}

interface SuccessResponse {
  success: true;
  data: any;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar API Key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY não configurada");
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Chave de API do serviço de e-mail não configurada. Entre em contato com o suporte.",
        errorType: 'api_key'
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(apiKey);

    // Parse request body
    let requestBody: EmailRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Erro ao parsear body:", parseError);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Dados da requisição inválidos",
        errorType: 'desconhecido'
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      to, 
      clienteNome, 
      modelo, 
      mensalidade, 
      validadeDias, 
      pdfUrl, 
      pdfBase64,
      filename,
      empresaNome = "Proteção Veicular"
    } = requestBody;

    console.log("=== Iniciando envio de e-mail ===");
    console.log("Destinatário:", to);
    console.log("Cliente:", clienteNome);
    console.log("Modelo:", modelo);
    console.log("PDF Base64 presente:", !!pdfBase64);
    console.log("PDF URL presente:", !!pdfUrl);

    // Validar e-mail do destinatário
    if (!to || !to.includes('@')) {
      console.error("E-mail do destinatário inválido:", to);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "E-mail do destinatário é obrigatório e deve ser válido",
        errorType: 'destinatario'
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validar PDF
    if (!pdfBase64 && !pdfUrl) {
      console.error("Nenhum PDF fornecido");
      const errorResponse: ErrorResponse = {
        success: false,
        error: "PDF da proposta não foi gerado corretamente",
        errorType: 'pdf'
      };
      return new Response(
        JSON.stringify(errorResponse),
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
      <img src="https://sbtfhtllzpurjprivqoi.supabase.co/storage/v1/object/public/branding/logo-harmony-branca.png" alt="Harmony Agro" style="max-height: 60px; margin-bottom: 12px;" />
      <h1>Proposta de Cotação</h1>
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
        ⏳ <strong>Validade da proposta:</strong> ${validadeDias || 7} dias
      </div>
      
      <p>📎 <strong>Em anexo você encontra a proposta completa em PDF.</strong></p>
      
      ${pdfUrl ? `
      <div class="cta">
        <a href="${pdfUrl}" class="btn">📄 Ver Proposta Online</a>
      </div>
      ` : ""}
      
      <p>Qualquer dúvida, estamos à disposição!</p>
      
      <p>🤝 Conte com a gente!</p>
    </div>
    
    <div class="footer">
      <p><strong>${empresaNome}</strong> - Proteção Veicular</p>
      <p>Protegendo o que é seu com transparência e confiança.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Preparar opções do e-mail
    const emailOptions: any = {
      from: `${empresaNome} <noreply@resend.dev>`,
      to: [to],
      subject: `Proposta de Cotação – ${modelo || empresaNome}`,
      html: htmlContent,
    };

    // Anexar PDF se disponível em base64
    if (pdfBase64) {
      console.log("Anexando PDF ao e-mail...");
      emailOptions.attachments = [
        {
          filename: filename || "Proposta.pdf",
          content: pdfBase64,
        },
      ];
    }

    console.log("Enviando e-mail via Resend...");
    const emailResponse = await resend.emails.send(emailOptions);

    console.log("Resposta do Resend:", JSON.stringify(emailResponse));

    // Verificar se houve erro na resposta do Resend
    if (emailResponse.error) {
      const errorMessage = emailResponse.error.message || "Erro desconhecido no envio";
      console.error("Erro do Resend:", errorMessage);
      
      let errorType: ErrorResponse['errorType'] = 'desconhecido';
      let userMessage = errorMessage;

      // Identificar tipo de erro
      if (errorMessage.includes('API key') || errorMessage.includes('api_key')) {
        errorType = 'api_key';
        userMessage = "Erro na configuração da API de e-mail. Entre em contato com o suporte.";
      } else if (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain')) {
        // Erro específico: modo teste do Resend
        errorType = 'remetente';
        userMessage = "⚠️ Resend em modo teste: só é possível enviar para harmonysistema@gmail.com. Para enviar para outros destinatários, verifique um domínio em resend.com/domains";
      } else if (errorMessage.includes('from') || errorMessage.includes('sender') || errorMessage.includes('domain')) {
        errorType = 'remetente';
        userMessage = "O domínio do remetente ainda não está verificado no Resend (ou a RESEND_API_KEY é de outra conta). Confirme que harmonyagro.com.br está como VERIFIED e, se necessário, gere uma nova API key e atualize no sistema.";
      } else if (errorMessage.includes('to') || errorMessage.includes('recipient') || errorMessage.includes('email address')) {
        errorType = 'destinatario';
        userMessage = "E-mail do destinatário inválido.";
      } else if (errorMessage.includes('attachment') || errorMessage.includes('content')) {
        errorType = 'pdf';
        userMessage = "Erro ao anexar o PDF. Tente novamente.";
      }

      const errorResponse: ErrorResponse = {
        success: false,
        error: userMessage,
        errorType
      };

      const status = typeof (emailResponse.error as any)?.statusCode === "number"
        ? (emailResponse.error as any).statusCode
        : 400;
      
      return new Response(
        JSON.stringify(errorResponse),
        { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("E-mail enviado com sucesso! ID:", emailResponse.data?.id);

    const successResponse: SuccessResponse = {
      success: true,
      data: emailResponse.data,
      message: "E-mail enviado com sucesso!"
    };

    return new Response(
      JSON.stringify(successResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro inesperado:", error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || "Erro inesperado ao enviar e-mail",
      errorType: 'desconhecido'
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
