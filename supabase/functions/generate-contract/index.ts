/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GenerateContractBody = {
  mensalidadeId: string;
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
  // remove extra last blank
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function applyVariables(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const k = String(key);
    return vars[k] ?? "";
  });
}

type ContractSection = {
  title: string;
  body: string;
};

function parseMarkdownToSections(md: string): { docTitle: string; sections: ContractSection[] } {
  const lines = md.replace(/\r/g, "").split("\n");

  let docTitle = "Contrato";
  const sections: ContractSection[] = [];

  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    const title = currentTitle.trim();
    if (title || body) {
      sections.push({
        title: title || "Seção",
        body,
      });
    }
    currentTitle = "";
    currentBody = [];
  };

  const isImplicitSectionTitle = (line: string) => {
    const t = stripMarkdown(line).trim();
    if (!t) return false;

    // CLÁUSULAS / CAPÍTULOS / SEÇÕES (comum em regulamentos)
    if (/^(CL[ÁA]USULA|CAP[ÍI]TULO|SE[CÇ][ÃA]O)\b/i.test(t)) return true;

    // Títulos em caixa alta curtos (evita capturar parágrafos longos)
    const isAllCaps = t === t.toUpperCase() && /[A-ZÁÉÍÓÚÇÃÕ]/.test(t);
    if (isAllCaps && t.length <= 70) return true;

    return false;
  };

  let sawAnyHeading = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    if (h1) {
      sawAnyHeading = true;
      if (docTitle === "Contrato") {
        docTitle = h1[1].trim();
        continue;
      }
      flush();
      currentTitle = h1[1].trim();
      continue;
    }
    if (h2) {
      sawAnyHeading = true;
      flush();
      currentTitle = h2[1].trim();
      continue;
    }

    // Heurística para DOCX colado: títulos sem markdown
    const prev = (lines[i - 1] ?? "").trim();
    const isNewBlock = prev === "";
    if (!sawAnyHeading && isNewBlock && isImplicitSectionTitle(line)) {
      flush();
      currentTitle = line.trim();
      continue;
    }

    currentBody.push(line);
  }
  flush();

  if (sections.length === 0) {
    sections.push({ title: "Conteúdo", body: md.trim() });
  }

  return { docTitle, sections };
}

function drawRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  // SVG path (y cresce para cima no pdf-lib)
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;
  return [
    `M ${x0 + rr} ${y0}`,
    `L ${x1 - rr} ${y0}`,
    `Q ${x1} ${y0} ${x1} ${y0 + rr}`,
    `L ${x1} ${y1 - rr}`,
    `Q ${x1} ${y1} ${x1 - rr} ${y1}`,
    `L ${x0 + rr} ${y1}`,
    `Q ${x0} ${y1} ${x0} ${y1 - rr}`,
    `L ${x0} ${y0 + rr}`,
    `Q ${x0} ${y0} ${x0 + rr} ${y0}`,
    "Z",
  ].join(" ");
}

function wrapToWidth(font: any, text: string, fontSize: number, maxWidth: number) {
  // Mantém quebras reais do texto, sem inserir espaçamento extra por parágrafo.
  const out: string[] = [];
  const rows = text.replace(/\r/g, "").split("\n");
  for (const row of rows) {
    const p = row.trimEnd();
    if (!p.trim()) {
      out.push("");
      continue;
    }

    // Se já é uma linha curta (ex.: "CPF: ..."), tenta manter sem re-quebrar.
    const naturalWidth = font.widthOfTextAtSize(p, fontSize);
    if (naturalWidth <= maxWidth) {
      out.push(p);
      continue;
    }

    const words = p.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(next, fontSize);
      if (width > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }

  // remove blanks finais
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

async function createContractPdfBytes(params: {
  title: string;
  markdown: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout oficial (formulário) – sem marca d’água/ícones/decoração
  const { docTitle, sections } = parseMarkdownToSections(params.markdown);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 48;
  const footerH = 28;

  const headerBoxH = 86;
  const docTitleBoxH = 44;

  const titleSize = 14;
  const sectionTitleSize = 10;
  const bodySize = 11;
  const lineHeight = 15;

  const borderColor = rgb(0.35, 0.35, 0.35);
  const titleGray = rgb(0.45, 0.45, 0.45);
  const textBlack = rgb(0, 0, 0);

  const drawHeaderBox = (p: any, pageNumber: number) => {
    const { width, height } = p.getSize();
    const x = margin;
    const yTop = height - margin;
    const w = width - margin * 2;
    const y = yTop - headerBoxH;

    p.drawRectangle({
      x,
      y,
      width: w,
      height: headerBoxH,
      borderColor,
      borderWidth: 1,
    });

    // Linhas do cabeçalho (com campos sublinhados como no modelo)
    const left = x + 12;
    let ty = yTop - 18;
    p.drawText("HARMONY CLUBE DE BENEFÍCIOS", { x: left, y: ty, size: 11, font: fontBold, color: textBlack });
    ty -= 15;
    p.drawText("CNPJ: 39.583.767/0001-26", { x: left, y: ty, size: 10.5, font, color: textBlack });
    ty -= 15;

    const labelEndereco = "Endereço:";
    p.drawText(labelEndereco, { x: left, y: ty, size: 10.5, font, color: textBlack });
    const endLabelW = font.widthOfTextAtSize(labelEndereco, 10.5);
    p.drawLine({
      start: { x: left + endLabelW + 6, y: ty + 3 },
      end: { x: x + w - 12, y: ty + 3 },
      thickness: 1,
      color: borderColor,
    });
    ty -= 15;

    const labelTel = "Telefone: (__)";
    p.drawText(labelTel, { x: left, y: ty, size: 10.5, font, color: textBlack });
    const telLabelW = font.widthOfTextAtSize(labelTel, 10.5);
    p.drawLine({
      start: { x: left + telLabelW + 6, y: ty + 3 },
      end: { x: left + telLabelW + 6 + 180, y: ty + 3 },
      thickness: 1,
      color: borderColor,
    });

    // Linha divisória dentro do cabeçalho
    p.drawLine({
      start: { x: x + 10, y: y + 14 },
      end: { x: x + w - 10, y: y + 14 },
      thickness: 1,
      color: borderColor,
    });

    // Numeração discreta
    p.drawText(`Página ${pageNumber}`, {
      x: x + w - 90,
      y: y + 18,
      size: 9,
      font,
      color: titleGray,
    });
  };

  const drawDocTitleBox = (p: any, title: string, yTop: number) => {
    const { width } = p.getSize();
    const x = margin;
    const w = width - margin * 2;
    const y = yTop - docTitleBoxH;

    p.drawRectangle({
      x,
      y,
      width: w,
      height: docTitleBoxH,
      borderColor,
      borderWidth: 1,
    });

    const safe = stripMarkdown(title).trim() || "FICHA DE AFILIAÇÃO";
    const textW = fontBold.widthOfTextAtSize(safe, titleSize);
    p.drawText(safe, {
      x: x + (w - textW) / 2,
      y: y + (docTitleBoxH - titleSize) / 2 + 2,
      size: titleSize,
      font: fontBold,
      color: textBlack,
    });
  };

  const newPage = (pageNumber: number) => {
    const p = pdfDoc.addPage(pageSize);
    drawHeaderBox(p, pageNumber);
    const { height } = p.getSize();
    drawDocTitleBox(p, params.title || docTitle, height - margin - headerBoxH - 10);
    return p;
  };

  let pageNumber = 1;
  let page = newPage(pageNumber);
  const { width, height } = page.getSize();
  const contentW = width - margin * 2;
  const contentTopY = height - margin - headerBoxH - 10 - docTitleBoxH - 14;
  const contentBottomY = margin + footerH;

  let y = contentTopY;

  const sectionPaddingX = 12;
  const sectionPaddingY = 10;
  const sectionGap = 12;
  const sectionHeaderH = 24;

  const drawSectionBox = (section: ContractSection) => {
    const safeTitle = stripMarkdown(section.title).trim();
    const safeBody = stripMarkdown(section.body).trim();

    const innerW = contentW - sectionPaddingX * 2;
    const titleLines = wrapToWidth(fontBold, safeTitle, sectionTitleSize, innerW);
    const bodyLines = wrapToWidth(font, safeBody, bodySize, innerW);

    const titleH = titleLines.length ? titleLines.length * (sectionTitleSize + 3) : 0;
    const bodyH = bodyLines.length ? bodyLines.length * lineHeight : 0;
    // Header fixo (estilo formulário do modelo), sem “respiro” exagerado.
    const boxH = sectionHeaderH + sectionPaddingY + bodyH + sectionPaddingY;

    if (y - boxH < contentBottomY) {
      pageNumber += 1;
      page = newPage(pageNumber);
      const ph = page.getSize().height;
      y = ph - margin - headerBoxH - 10 - docTitleBoxH - 14;
    }

    const x = margin;
    const yBox = y - boxH;

    page.drawRectangle({
      x,
      y: yBox,
      width: contentW,
      height: boxH,
      borderColor,
      borderWidth: 1,
    });

    // Faixa de título (cinza claro) + linha inferior
    page.drawRectangle({
      x,
      y: y + (-sectionHeaderH),
      width: contentW,
      height: sectionHeaderH,
      color: rgb(0.97, 0.97, 0.97),
    });
    page.drawLine({
      start: { x, y: y - sectionHeaderH },
      end: { x: x + contentW, y: y - sectionHeaderH },
      thickness: 1,
      color: borderColor,
    });

    // Título centralizado na faixa
    const titleText = titleLines.filter((l) => l.trim()).join(" ").trim() || "SEÇÃO";
    page.drawText(titleText, {
      x: x + sectionPaddingX,
      y: y - 16,
      size: sectionTitleSize,
      font: fontBold,
      color: titleGray,
      maxWidth: innerW,
    });

    let ty = y - sectionHeaderH - sectionPaddingY - bodySize;

    for (const l of bodyLines) {
      if (!l.trim()) {
        ty -= Math.round(lineHeight * 0.8);
        continue;
      }
      page.drawText(l, {
        x: x + sectionPaddingX,
        y: ty,
        size: bodySize,
        font,
        color: textBlack,
        maxWidth: innerW,
      });
      ty -= lineHeight;
    }

    y = yBox - sectionGap;
  };

  for (const s of sections) drawSectionBox(s);

  return await pdfDoc.save();
}

async function fetchPublicAssetBytes(publicPath: string) {
  try {
    const origin = (globalThis as any).__CONTRACT_ORIGIN__ as string | undefined;
    const base = origin || "https://painelharmonyagrocombr.lovable.app";
    const url = `${base}${publicPath.startsWith("/") ? "" : "/"}${publicPath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function wrapTextToLines(text: string, maxChars: number) {
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

async function createPdfBytesFromTemplate(params: {
  title: string;
  text: string;
  logoBytes: Uint8Array | null;
  templateBytes: Uint8Array | null;
}) {
  if (!params.templateBytes) return null;

  const pdfDoc = await PDFDocument.load(params.templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoImage = params.logoBytes ? await pdfDoc.embedPng(params.logoBytes) : null;

  const margin = 48;
  const headerH = 46;
  const footerH = 42;
  const fontSize = 11;
  const lineHeight = 16;

  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    pdfDoc.addPage([595.28, 841.89]);
  }

  const drawTimbrado = (p: any) => {
    const { width, height } = p.getSize();

    // Cabeçalho: logo topo-esquerda
    if (logoImage) {
      const targetH = 22;
      const scale = targetH / logoImage.height;
      const targetW = logoImage.width * scale;
      p.drawImage(logoImage, {
        x: margin,
        y: height - margin - targetH,
        width: targetW,
        height: targetH,
      });
    }

    // Rodapé: linha + texto
    const footerY = margin + 18;
    p.drawLine({
      start: { x: margin, y: margin + footerH - 10 },
      end: { x: width - margin, y: margin + footerH - 10 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    p.drawText("Harmony Agro • Clube de Benefícios", {
      x: margin,
      y: footerY,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });

    // Marca d’água: logo central com baixa opacidade
    if (logoImage) {
      const { width, height } = p.getSize();
      const maxW = width * 0.62;
      const scale = Math.min(maxW / logoImage.width, 1);
      const w = logoImage.width * scale;
      const h = logoImage.height * scale;
      p.drawImage(logoImage, {
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
        opacity: 0.08,
      });
    }
  };

  // Render do conteúdo por cima do PDF base, respeitando áreas de timbrado
  const textLines = wrapTextToLines(params.text, 95);
  let pageIndex = 0;

  const ensurePage = () => {
    const existing = pdfDoc.getPages();
    if (pageIndex < existing.length) return existing[pageIndex];
    const newPage = pdfDoc.addPage([595.28, 841.89]);
    return newPage;
  };

  let page = ensurePage();
  drawTimbrado(page);
  const size0 = page.getSize();
  let y = size0.height - margin - headerH - 60; // espaço para layout do modelo
  const contentBottomY = margin + footerH;
  const maxWidth = size0.width - margin * 2;

  // Título (pequeno, não briga com o layout do modelo)
  page.drawText(params.title, {
    x: margin,
    y: size0.height - margin - headerH - 24,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  for (const line of textLines) {
    if (y < contentBottomY) {
      pageIndex += 1;
      page = ensurePage();
      drawTimbrado(page);
      const s = page.getSize();
      y = s.height - margin - headerH - 40;
    }

    // Evita ultrapassar margem horizontal
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      maxWidth,
    });
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

async function createSimplePdfBytes(title: string, text: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Logo padrão (Harmony Agro) vindo do frontend (public/images). Usamos o Origin da request
  // para funcionar em preview e publicado.
  const logoBytes = await fetchPublicAssetBytes("/images/harmony-logo-agro.png");

  const logoImage = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const margin = 48;
  const headerH = 46;
  const footerH = 42;
  const contentTopY = height - margin - headerH;
  const contentBottomY = margin + footerH;
  const fontSize = 11;
  const lineHeight = 16;
  const maxWidth = width - margin * 2;

  // crude estimation for chars per line based on font
  const avgCharWidth = font.widthOfTextAtSize("ABCDEFGHIJKLMNOPQRSTUVWXYZ", fontSize) / 26;
  const maxChars = Math.max(40, Math.floor(maxWidth / avgCharWidth));

  const drawTimbrado = (p: any) => {
    // Cabeçalho: logo topo-esquerda
    if (logoImage) {
      const targetH = 22;
      const scale = targetH / logoImage.height;
      const targetW = logoImage.width * scale;
      p.drawImage(logoImage, {
        x: margin,
        y: height - margin - targetH,
        width: targetW,
        height: targetH,
      });
    }

    // Rodapé: linha + texto
    const footerY = margin + 18;
    p.drawLine({
      start: { x: margin, y: margin + footerH - 10 },
      end: { x: width - margin, y: margin + footerH - 10 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    p.drawText("Harmony Agro • Clube de Benefícios", {
      x: margin,
      y: footerY,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });

    // Marca d’água: logo central com baixa opacidade
    if (logoImage) {
      const maxW = width * 0.62;
      const scale = Math.min(maxW / logoImage.width, 1);
      const w = logoImage.width * scale;
      const h = logoImage.height * scale;
      p.drawImage(logoImage, {
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
        opacity: 0.08,
      });
    }
  };

  drawTimbrado(page);

  let y = contentTopY;

  // Title
  page.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
  });
  y -= 24;

  const lines = wrapText(text, maxChars);
  for (const line of lines) {
    if (y < contentBottomY) {
      // new page
      page = pdfDoc.addPage([595.28, 841.89]);
      drawTimbrado(page);
      y = page.getSize().height - margin - headerH;
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
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Guardamos o origin para a geração do PDF conseguir buscar o logo padrão do frontend.
    (globalThis as any).__CONTRACT_ORIGIN__ = req.headers.get("origin") ?? undefined;

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

    const body = (await req.json()) as GenerateContractBody;
    if (!body?.mensalidadeId) {
      return new Response(JSON.stringify({ error: "mensalidadeId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Autorização: financeiro ou admin
    const { data: rolesRows, error: rolesErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw rolesErr;

    const roles = (rolesRows ?? []).map((r: any) => r.role);
    const allowed = roles.includes("financeiro") || roles.includes("admin_principal") || roles.includes("admin_nivel_basico") || roles.includes("admin_regional");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão para gerar contrato" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar mensalidade e vínculos
    const { data: mensalidade, error: mensErr } = await adminClient
      .from("mensalidades")
      .select(
        `id, status, company_id, associado_id, veiculo_id, valor_final, data_pagamento,
         associados:associados!inner(id, nome_completo, cpf, email),
         veiculos:veiculos(id, placa, modelo, ano, cota_id, cotas:cotas(id, cota_nome))`
      )
      .eq("id", body.mensalidadeId)
      .maybeSingle();

    if (mensErr) throw mensErr;
    if (!mensalidade) {
      return new Response(JSON.stringify({ error: "Mensalidade não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mensalidade.status !== "paga") {
      return new Response(JSON.stringify({ skipped: true, reason: "status_not_paid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = mensalidade.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing_company" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Configurações
    const { data: settings } = await adminClient
      .from("document_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    const autoGenerate = settings?.auto_generate_contract ?? true;
    const sendEmail = settings?.send_contract_by_email ?? true;

    if (!autoGenerate) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Evitar duplicidade: já existe contrato para essa mensalidade?
    const { data: existing } = await adminClient
      .from("generated_contracts")
      .select("id")
      .eq("mensalidade_id", mensalidade.id)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_generated" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template contrato padrão
    const { data: template, error: tplErr } = await adminClient
      .from("document_templates")
      .select("id, title, content_markdown")
      .eq("company_id", companyId)
      .eq("template_type", "contract")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tplErr) throw tplErr;
    if (!template) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing_template" }), {
        status: 200,
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
      return new Response(JSON.stringify({ skipped: true, reason: "missing_version" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PostgREST embeds podem vir como objeto ou array dependendo do relacionamento.
    const associado = (mensalidade as any).associados?.[0] ?? (mensalidade as any).associados ?? null;
    const veiculo = (mensalidade as any).veiculos?.[0] ?? (mensalidade as any).veiculos ?? null;
    const cota = veiculo?.cotas?.[0] ?? veiculo?.cotas ?? null;
    const plano = cota?.cota_nome ?? "";
    const dataPag = mensalidade.data_pagamento ?? new Date().toISOString();
    const dataBR = new Date(dataPag).toLocaleDateString("pt-BR");

    const vars: Record<string, string> = {
      nome: associado?.nome_completo ?? "",
      cpf: associado?.cpf ?? "",
      plano,
      data: dataBR,
      placa: veiculo?.placa ?? "",
      modelo: veiculo?.modelo ?? "",
      ano: veiculo?.ano ? String(veiculo.ano) : "",
      mensalidade: mensalidade.valor_final ? String(mensalidade.valor_final) : "",
    };

    const contentSnapshot = version.content_markdown;
    const renderedMarkdown = applyVariables(contentSnapshot, vars);
    const pdfBytes = await createContractPdfBytes({
      title: template.title ?? "Contrato",
      markdown: renderedMarkdown,
    });

    // Criar registro primeiro (para gerar path)
    const ipRaw = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
    const ip = ipRaw ? ipRaw.split(",")[0].trim() : null;

    const { data: inserted, error: insErr } = await adminClient
      .from("generated_contracts")
      .insert({
        company_id: companyId,
        associado_id: mensalidade.associado_id,
        veiculo_id: mensalidade.veiculo_id,
        mensalidade_id: mensalidade.id,
        template_version_id: version.id,
        status: "gerado",
        content_markdown_snapshot: contentSnapshot,
          rendered_text_snapshot: stripMarkdown(renderedMarkdown),
        generated_by: userId,
        generated_ip: settings?.record_ip_and_date ? ip : null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    const contractId = inserted.id;
    const pdfPath = `contracts/${companyId}/${mensalidade.associado_id}/${contractId}.pdf`;

    const { error: uploadErr } = await adminClient
      .storage
      .from("termos-aceite")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw uploadErr;

    const { error: updErr } = await adminClient
      .from("generated_contracts")
      .update({ pdf_path: pdfPath })
      .eq("id", contractId);
    if (updErr) throw updErr;

    // Enviar por e-mail
    if (sendEmail && associado?.email) {
      try {
        await sendEmailWithResend({
          to: associado.email,
          subject: "Seu contrato foi gerado",
          html: `<p>Olá, ${associado.nome_completo ?? ""}.</p><p>Segue em anexo o seu contrato.</p>`,
          pdfBytes,
          filename: `contrato-${contractId}.pdf`,
        });
        await adminClient.from("generated_contracts").update({ status: "enviado" }).eq("id", contractId);
      } catch (e) {
        console.error("email_error", e);
        // mantém como gerado
      }
    }

    return new Response(JSON.stringify({ success: true, contractId, pdfPath }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-contract error", e);
    return new Response(JSON.stringify({ error: (e as any)?.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
