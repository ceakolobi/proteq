/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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
    if (/^(CL[ÁA]USULA|CAP[ÍI]TULO|SE[CÇ][ÃA]O)\b/i.test(t)) return true;
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
  const out: string[] = [];
  const rows = text.replace(/\r/g, "").split("\n");
  for (const row of rows) {
    const p = row.trimEnd();
    if (!p.trim()) {
      out.push("");
      continue;
    }

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

    p.drawLine({
      start: { x: x + 10, y: y + 14 },
      end: { x: x + w - 10, y: y + 14 },
      thickness: 1,
      color: borderColor,
    });

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

async function fetchUrlBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function prependCoverToPdf(
  coverImgBytes: Uint8Array,
  contractBytes: Uint8Array,
  mimeHint: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const coverPage = doc.addPage([595.28, 841.89]);

  let img = null;
  try {
    img = mimeHint === "png"
      ? await doc.embedPng(coverImgBytes)
      : await doc.embedJpg(coverImgBytes);
  } catch {
    try { img = await doc.embedPng(coverImgBytes); } catch { /* ignore */ }
    if (!img) {
      try { img = await doc.embedJpg(coverImgBytes); } catch { /* ignore */ }
    }
  }

  if (img) {
    const { width, height } = coverPage.getSize();
    coverPage.drawImage(img, { x: 0, y: 0, width, height });
  }

  const contractDoc = await PDFDocument.load(contractBytes);
  const copied = await doc.copyPages(contractDoc, contractDoc.getPageIndices());
  copied.forEach((p) => doc.addPage(p));

  return await doc.save();
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

  const textLines = wrapTextToLines(params.text, 95);
  let pageIndex = 0;

  const ensurePage = () => {
    const existing = pdfDoc.getPages();
    if (pageIndex < existing.length) return existing[pageIndex];
    return pdfDoc.addPage([595.28, 841.89]);
  };

  let page = ensurePage();
  drawTimbrado(page);
  const size0 = page.getSize();
  let y = size0.height - margin - headerH - 60;
  const contentBottomY = margin + footerH;
  const maxWidth = size0.width - margin * 2;

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const ALLOWED_ROLES = ["admin_principal", "admin_nivel_basico", "admin_regional", "consultor_vendas", "cadastro", "financeiro"];
    const allowed = roles.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão para gerar contrato" }), {
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
    const renderedMarkdown = applyVariables(contentSnapshot, vars);
    let pdfBytes = await createContractPdfBytes({
      title: template.title ?? "Contrato",
      markdown: renderedMarkdown,
    });

    // Prepend cover page from company settings (cover_mode + cover images)
    try {
      const { data: settings } = await adminClient
        .from("company_settings")
        .select("cover_mode, cover_fixed_index, cover_1, cover_2, cover_3, cover_4")
        .eq("id", companyId)
        .maybeSingle();

      const { data: tableCovers } = await adminClient
        .from("company_covers")
        .select("public_url")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      const legacyUrls: string[] = [
        (settings as any)?.cover_1,
        (settings as any)?.cover_2,
        (settings as any)?.cover_3,
        (settings as any)?.cover_4,
      ].filter(Boolean) as string[];
      const tableUrls: string[] = ((tableCovers as any[]) || [])
        .map((c: any) => c.public_url)
        .filter(Boolean);
      const allCovers = [...legacyUrls, ...tableUrls];

      if (allCovers.length > 0) {
        const mode = (settings as any)?.cover_mode ?? "fixed";
        const fixedIndex = Number((settings as any)?.cover_fixed_index ?? 1);
        let coverUrl: string;
        if (mode === "random") {
          coverUrl = allCovers[Math.floor(Math.random() * allCovers.length)];
        } else {
          // "fixed" or "select" (auto-gen always uses configured fixed/first)
          coverUrl = allCovers[(fixedIndex - 1) % allCovers.length] ?? allCovers[0];
        }

        const coverBytes = await fetchUrlBytes(coverUrl);
        if (coverBytes) {
          const lower = coverUrl.toLowerCase();
          const mimeHint = lower.endsWith(".png") ? "png" : "jpeg";
          pdfBytes = await prependCoverToPdf(coverBytes, pdfBytes, mimeHint);
        }
      }
    } catch (coverErr) {
      console.warn("cover_prepend_error:", coverErr);
      // Continua sem capa se houver erro
    }

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
          rendered_text_snapshot: stripMarkdown(renderedMarkdown),
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
