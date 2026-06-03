import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbedAssinaturaRequest {
  vistoria_id: string;
  assinatura_base64: string; // data:image/png;base64,...
  contrato_url: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      vistoria_id,
      assinatura_base64,
      contrato_url,
    }: EmbedAssinaturaRequest = await req.json();

    if (!vistoria_id || !assinatura_base64 || !contrato_url) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch vistoria ───────────────────────────────────────────────────────
    const { data: vistoria, error: vErr } = await supabase
      .from("vistorias")
      .select("id,associado_id,veiculo_id,cotacao_id,token_assinatura,contrato_url")
      .eq("id", vistoria_id)
      .single();

    if (vErr || !vistoria) {
      return new Response(
        JSON.stringify({ success: false, error: "Vistoria não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Download contract PDF ────────────────────────────────────────────────
    const pdfRes = await fetch(contrato_url);
    if (!pdfRes.ok) {
      throw new Error(`Falha ao baixar contrato: ${pdfRes.status}`);
    }
    const pdfBytes = await pdfRes.arrayBuffer();

    // ── Embed signature ──────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Convert base64 to bytes
    const base64Data = assinatura_base64.replace(/^data:image\/png;base64,/, "");
    const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const sigImage = await pdfDoc.embedPng(sigBytes);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Signature block on last page
    const sigWidth = 180;
    const sigHeight = 60;
    const sigX = width / 2 - sigWidth / 2;
    const sigY = 90;

    // Draw signature line
    lastPage.drawLine({
      start: { x: sigX, y: sigY + sigHeight + 5 },
      end: { x: sigX + sigWidth, y: sigY + sigHeight + 5 },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Embed signature image
    lastPage.drawImage(sigImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
      opacity: 0.9,
    });

    // Add signed timestamp text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const now = new Date();
    const dateStr = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    lastPage.drawText(`Assinado digitalmente em ${dateStr}`, {
      x: sigX,
      y: sigY - 14,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const signedPdfBytes = await pdfDoc.save();

    // ── Upload signed PDF ────────────────────────────────────────────────────
    const fileName = `assinado_${Date.now()}.pdf`;
    const storagePath = `contratos/${vistoria_id}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from("documentos")
      .upload(storagePath, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: { publicUrl: signedUrl } } = supabase.storage
      .from("documentos")
      .getPublicUrl(storagePath);

    // ── Update vistorias ─────────────────────────────────────────────────────
    await supabase
      .from("vistorias")
      .update({
        assinado_em: new Date().toISOString(),
        contrato_url: signedUrl,
      } as never)
      .eq("id", vistoria_id);

    // ── Update cotacoes ──────────────────────────────────────────────────────
    if (vistoria.cotacao_id) {
      await supabase
        .from("cotacoes")
        .update({ contrato_gerado: true } as never)
        .eq("id", vistoria.cotacao_id);
    }

    // ── Send signed PDF by email ─────────────────────────────────────────────
    if (resendApiKey && vistoria.associado_id) {
      const { data: assoc } = await supabase
        .from("associados")
        .select("nome_completo,email")
        .eq("id", vistoria.associado_id)
        .single();

      if (assoc?.email) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Harmony Agro <noreply@harmonyclube.com.br>",
          to: [assoc.email],
          subject: "Seu contrato foi assinado — Harmony Agro",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#F97316;padding:24px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:22px">Harmony Agro</h1>
              </div>
              <div style="padding:32px 24px;background:#fff">
                <h2 style="color:#1e3a5f">Olá, ${assoc.nome_completo}!</h2>
                <p style="color:#374151">Seu contrato foi assinado digitalmente com sucesso. 🎉</p>
                <p style="color:#374151">Você pode baixar uma cópia pelo link abaixo:</p>
                <div style="text-align:center;margin:24px 0">
                  <a href="${signedUrl}" style="background:#1e3a5f;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
                    Baixar Contrato Assinado
                  </a>
                </div>
                <p style="color:#6b7280;font-size:13px">Bem-vindo à família Harmony Agro! Sua proteção está ativa.</p>
              </div>
            </div>
          `,
        }).catch(() => {/* email falha silenciosamente */});
      }
    }

    return new Response(
      JSON.stringify({ success: true, signed_url: signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
