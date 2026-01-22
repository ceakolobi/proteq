/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GenerateContractManualBody = {
  associadoId: string;
  veiculoId?: string | null;
  sendEmail?: boolean;
};

function stripMarkdown(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\r/g, "")
    .trim();
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = [];
  const paragraphs = text.split("\n");
  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    lines.push("");
  }
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function applyVariables(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const k = String(key);
    return vars[k] ?? "";
  });
}

async function createSimplePdfBytes(title: string, text: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const margin = 48;
  const fontSize = 11;
  const lineHeight = 16;
  const maxWidth = width - margin * 2;

  const avgCharWidth = font.widthOfTextAtSize("ABCDEFGHIJKLMNOPQRSTUVWXYZ", fontSize) / 26;
  const maxChars = Math.max(40, Math.floor(maxWidth / avgCharWidth));

  let y = height - margin;

  page.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
  });
  y -= 24;

  const lines = wrapText(text, maxChars);
  for (const line of lines) {
    if (y < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getSize().height - margin;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

async function sendEmailWithResend(params: { to: string; subject: string; html: string; pdfBytes: Uint8Array; filename: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Harmony <no-reply@harmony.local>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: [
        {
          filename: params.filename,
          content: btoa(String.fromCharCode(...params.pdfBytes)),
          content_type: "application/pdf",
        },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao enviar e-mail: ${res.status} ${txt}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Configuração do backend incompleta");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as GenerateContractManualBody;
    if (!body?.associadoId) {
      return new Response(JSON.stringify({ error: "associadoId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Autorização: apenas perfis ADMIN/MASTER (admin_principal/admin_nivel_basico/admin_regional)
    const { data: rolesRows, error: rolesErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw rolesErr;

    const roles = (rolesRows ?? []).map((r: any) => r.role);
    const allowed = roles.includes("admin_principal") || roles.includes("admin_nivel_basico") || roles.includes("admin_regional");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão para gerar contrato manual" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipRaw = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
    const ip = ipRaw ? ipRaw.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent") ?? null;

    // Buscar associado
    const { data: associado, error: aErr } = await adminClient
      .from("associados")
      .select("id, nome_completo, cpf, email, company_id")
      .eq("id", body.associadoId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!associado) {
      return new Response(JSON.stringify({ error: "Associado não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = associado.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Associado sem company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar veículo (se não vier, pega o mais recente)
    let veiculoId = body.veiculoId ?? null;
    if (!veiculoId) {
      const { data: latestVehicle } = await adminClient
        .from("veiculos")
        .select("id")
        .eq("associado_id", associado.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      veiculoId = latestVehicle?.id ?? null;
    }

    const { data: veiculo } = veiculoId
      ? await adminClient
          .from("veiculos")
          .select("id, placa, modelo, ano, mensalidade, cota_id, cotas:cotas(id, cota_nome)")
          .eq("id", veiculoId)
          .maybeSingle()
      : { data: null };

    const cota = (veiculo as any)?.cotas?.[0] ?? (veiculo as any)?.cotas ?? null;
    const plano = cota?.cota_nome ?? "";
    const dataBR = new Date().toLocaleDateString("pt-BR");

    // Template contrato padrão
    const { data: template, error: tplErr } = await adminClient
      .from("document_templates")
      .select("id, title")
      .eq("company_id", companyId)
      .eq("template_type", "contract")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tplErr) throw tplErr;
    if (!template) {
      return new Response(JSON.stringify({ error: "Template de contrato não encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: version, error: verErr } = await adminClient
      .from("document_template_versions")
      .select("id, version, content_markdown")
      .eq("template_id", template.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verErr) throw verErr;
    if (!version) {
      return new Response(JSON.stringify({ error: "Versão do template não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vars: Record<string, string> = {
      nome: associado.nome_completo ?? "",
      cpf: associado.cpf ?? "",
      plano,
      data: dataBR,
      placa: (veiculo as any)?.placa ?? "",
      modelo: (veiculo as any)?.modelo ?? "",
      ano: (veiculo as any)?.ano ? String((veiculo as any).ano) : "",
      mensalidade: (veiculo as any)?.mensalidade ? String((veiculo as any).mensalidade) : "",
    };

    const contentSnapshot = version.content_markdown;
    const rendered = applyVariables(contentSnapshot, vars);
    const plain = stripMarkdown(rendered);

    const pdfBytes = await createSimplePdfBytes(template.title ?? "Contrato", plain);

    const { data: inserted, error: insErr } = await adminClient
      .from("generated_contracts")
      .insert({
        company_id: companyId,
        associado_id: associado.id,
        veiculo_id: veiculoId,
        mensalidade_id: null,
        template_version_id: version.id,
        status: "gerado",
        content_markdown_snapshot: contentSnapshot,
        rendered_text_snapshot: plain,
        generated_by: userId,
        generated_ip: ip,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    const contractId = inserted.id;
    const pdfPath = `contracts/${companyId}/${associado.id}/${contractId}.pdf`;

    const { error: uploadErr } = await adminClient.storage.from("termos-aceite").upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadErr) throw uploadErr;

    const { error: updErr } = await adminClient
      .from("generated_contracts")
      .update({ pdf_path: pdfPath })
      .eq("id", contractId);
    if (updErr) throw updErr;

    const shouldSendEmail = body.sendEmail ?? true;
    if (shouldSendEmail && associado.email) {
      try {
        await sendEmailWithResend({
          to: associado.email,
          subject: "Seu contrato foi gerado",
          html: `<p>Olá, ${associado.nome_completo ?? ""}.</p><p>Segue em anexo o seu contrato.</p>`,
          pdfBytes,
          filename: `contrato-${contractId}.pdf`,
        });
        await adminClient.from("generated_contracts").update({
          status: "enviado",
          accepted_ip: ip,
          accepted_user_agent: userAgent,
        }).eq("id", contractId);
      } catch (e) {
        console.error("email_error", e);
      }
    }

    return new Response(JSON.stringify({ success: true, contractId, pdfPath }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-contract-manual error", e);
    return new Response(JSON.stringify({ error: (e as any)?.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
