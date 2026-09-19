import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface CapaRegulamentoData {
  clienteNome?: string | null;
  clienteCpf?: string | null;
  clienteEmail?: string | null;
  clienteWhatsapp?: string | null;
  modelo?: string | null;
  marca?: string | null;
  placa?: string | null;
  chassi?: string | null;
  anoFabricacao?: number | null;
  anoModelo?: number | null;
  valorBem?: number | null;
  mensalidade?: number | null;
  numeroCotacao?: string | null;
  empresaNome?: string;
}

const REGULAMENTO_URL = "/regulamento-interno-harmony.pdf";

const fmtMoney = (v?: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmt = (v?: string | number | null) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

/**
 * Mescla a proposta gerada com uma capa personalizada + o Regulamento Interno.
 * Retorna um Blob PDF único pronto para download / e-mail.
 */
export async function mergePropostaComRegulamento(
  propostaBlob: Blob,
  dados: CapaRegulamentoData
): Promise<Blob> {
  // 1. Carrega proposta
  const propostaBytes = await propostaBlob.arrayBuffer();
  const merged = await PDFDocument.create();
  const propostaDoc = await PDFDocument.load(propostaBytes);

  // 2. Copia páginas da proposta primeiro
  const propostaPages = await merged.copyPages(
    propostaDoc,
    propostaDoc.getPageIndices()
  );
  propostaPages.forEach((p) => merged.addPage(p));

  // 3. Capa personalizada do regulamento
  const helv = await merged.embedFont(StandardFonts.Helvetica);
  const helvBold = await merged.embedFont(StandardFonts.HelveticaBold);

  const capa = merged.addPage([595.28, 841.89]); // A4
  const { width, height } = capa.getSize();
  const orange = rgb(0.92, 0.45, 0.13);
  const dark = rgb(0.15, 0.15, 0.2);
  const gray = rgb(0.35, 0.35, 0.4);

  // Cabeçalho
  capa.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: orange });
  capa.drawText(dados.empresaNome || "PROTEQ", {
    x: 40,
    y: height - 50,
    size: 18,
    font: helvBold,
    color: rgb(1, 1, 1),
  });
  capa.drawText("Regulamento Interno — Documento Personalizado", {
    x: 40,
    y: height - 72,
    size: 11,
    font: helv,
    color: rgb(1, 1, 1),
  });

  // Título
  capa.drawText("DADOS DO ASSOCIADO E DA PROPOSTA", {
    x: 40,
    y: height - 140,
    size: 14,
    font: helvBold,
    color: dark,
  });

  // Linhas de dados
  const linhas: Array<[string, string]> = [
    ["Nº da Proposta", fmt(dados.numeroCotacao)],
    ["Nome", fmt(dados.clienteNome)],
    ["CPF/CNPJ", fmt(dados.clienteCpf)],
    ["E-mail", fmt(dados.clienteEmail)],
    ["WhatsApp", fmt(dados.clienteWhatsapp)],
    [
      "Veículo",
      `${fmt(dados.marca)} ${fmt(dados.modelo)}`.trim().replace(/—\s—/g, "—"),
    ],
    [
      "Ano",
      dados.anoFabricacao
        ? `${dados.anoFabricacao}${dados.anoModelo ? `/${dados.anoModelo}` : ""}`
        : "—",
    ],
    ["Placa", fmt(dados.placa)],
    ["Chassi", fmt(dados.chassi)],
    ["Valor do Bem (FIPE)", fmtMoney(dados.valorBem)],
    ["Mensalidade", fmtMoney(dados.mensalidade)],
    ["Data de Adesão", new Date().toLocaleDateString("pt-BR")],
  ];

  let y = height - 175;
  linhas.forEach(([label, valor]) => {
    capa.drawText(label.toUpperCase(), {
      x: 40,
      y,
      size: 8,
      font: helvBold,
      color: gray,
    });
    capa.drawText(valor, { x: 40, y: y - 14, size: 11, font: helv, color: dark });
    capa.drawLine({
      start: { x: 40, y: y - 20 },
      end: { x: width - 40, y: y - 20 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.9),
    });
    y -= 36;
  });

  // Declaração
  const decl =
    "Ao aderir ao programa de proteção veicular da PROTEQ, o associado declara ter lido, compreendido e aceito integralmente as condições, direitos e deveres descritos no Regulamento Interno anexo a este documento.";
  const palavras = decl.split(" ");
  let linha = "";
  let yDecl = y - 20;
  capa.drawText("DECLARAÇÃO DE ACEITE", {
    x: 40,
    y: yDecl,
    size: 11,
    font: helvBold,
    color: dark,
  });
  yDecl -= 18;
  palavras.forEach((p) => {
    const teste = linha + p + " ";
    if (helv.widthOfTextAtSize(teste, 10) > width - 80) {
      capa.drawText(linha.trim(), { x: 40, y: yDecl, size: 10, font: helv, color: dark });
      yDecl -= 14;
      linha = p + " ";
    } else {
      linha = teste;
    }
  });
  if (linha) capa.drawText(linha.trim(), { x: 40, y: yDecl, size: 10, font: helv, color: dark });

  // Rodapé
  capa.drawText(
    "Regulamento Interno completo nas páginas a seguir.",
    { x: 40, y: 40, size: 9, font: helv, color: gray }
  );

  // 4. Anexar regulamento
  try {
    const res = await fetch(REGULAMENTO_URL);
    if (res.ok) {
      const regBytes = await res.arrayBuffer();
      const regDoc = await PDFDocument.load(regBytes);
      const regPages = await merged.copyPages(regDoc, regDoc.getPageIndices());
      regPages.forEach((p) => merged.addPage(p));
    } else {
      console.warn("Regulamento não encontrado em", REGULAMENTO_URL);
    }
  } catch (e) {
    console.error("Falha ao carregar regulamento:", e);
  }

  const out = await merged.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

/**
 * Appends the internal regulation PDF to an existing PDF (as ArrayBuffer).
 * The regulation is fetched from /regulamento-interno-harmony.pdf (public folder).
 * If the file is not found, returns the original PDF unchanged.
 */
export async function appendRegulamento(pdfBytes: ArrayBuffer): Promise<Blob> {
  const merged = await PDFDocument.load(pdfBytes);
  try {
    const res = await fetch("/regulamento-interno-harmony.pdf");
    if (res.ok) {
      const regDoc = await PDFDocument.load(await res.arrayBuffer());
      const pages = await merged.copyPages(regDoc, regDoc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
  } catch {
    // regulamento is optional — proceed without it
  }
  const out = await merged.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}
