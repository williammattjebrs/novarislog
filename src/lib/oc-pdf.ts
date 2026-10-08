// PDF real da Ordem de Coleta gerado a partir do snapshot imutável (servidor e testes).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { OcSnapshot } from "./oc-model";

const NAVY = rgb(0.043, 0.075, 0.145), ORANGE = rgb(1, 0.42, 0), GRAY = rgb(0.35, 0.35, 0.35);
// Fontes padrão usam WinAnsi: acentos do português funcionam; símbolos fora do conjunto são trocados.
const clean = (s: unknown) => String(s ?? "").normalize("NFC").replace(/[→⇒]/g, "->").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");
export const fmtDataHora = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "a definir");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

export async function renderOcPdf(s: OcSnapshot & { versao?: number }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Ordem de Coleta ${s.numero} v${s.versao ?? 1}`); doc.setAuthor("Novaris TMS"); doc.setCreationDate(new Date(s.emitidoEm));
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 40, CW = W - 2 * M;
  let page: PDFPage = doc.addPage([W, H]); let y = H - M; let pageNo = 1;
  const header = () => {
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: NAVY });
    page.drawText("NOVARIS", { x: M, y: H - 38, size: 20, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Operador Logístico Integrado", { x: M, y: H - 54, size: 9, font, color: ORANGE });
    const t = clean(`ORDEM DE COLETA ${s.numero}`);
    page.drawText(t, { x: W - M - bold.widthOfTextAtSize(t, 14), y: H - 36, size: 14, font: bold, color: rgb(1, 1, 1) });
    const v = clean(`Documento v${s.versao ?? 1} · emitido ${fmtDataHora(s.emitidoEm)} · pág. ${pageNo}`);
    page.drawText(v, { x: W - M - font.widthOfTextAtSize(v, 8), y: H - 52, size: 8, font, color: rgb(1, 1, 1) });
    y = H - 90;
  };
  let onNewPage: (() => void) | null = null;
  const ensure = (h: number) => { if (y - h < M + 20) { page = doc.addPage([W, H]); pageNo++; header(); onNewPage?.(); } };
  const text = (t: string, o: { size?: number; b?: boolean; color?: ReturnType<typeof rgb>; x?: number; w?: number } = {}) => {
    const size = o.size ?? 10; const f = o.b ? bold : font;
    for (const line of wrap(t, f, size, o.w ?? CW - ((o.x ?? M) - M))) { ensure(size + 4); page.drawText(line, { x: o.x ?? M, y: y - size, size, font: f, color: o.color ?? rgb(0, 0, 0) }); y -= size + 4; }
  };
  const section = (title: string) => { ensure(30); y -= 8; page.drawRectangle({ x: M, y: y - 16, width: CW, height: 16, color: rgb(0.95, 0.95, 0.95) }); page.drawText(clean(title.toUpperCase()), { x: M + 6, y: y - 12, size: 9, font: bold, color: ORANGE }); y -= 22; };
  header();

  // Bloco de destaque obrigatório: dono da carga x local físico x cidade.
  const half = (CW - 10) / 2;
  const boxRows = (titulo: string, cliente: string, local: string, cidade: string) => {
    const k = titulo === "COLETA" ? "coleta" : "descarga";
    return ([[`Cliente da ${k}`, cliente], [`Local da ${k}`, local], ["Cidade", cidade]] as const).map(([r, v]) => [r, wrap(v, bold, 11, half - 20).slice(0, 2)] as const);
  };
  const coletas = s.coletas?.length ? s.coletas : [s.coleta.local];
  const nomeLocal = new Map(coletas.map((l) => [l.id, l.nome]));
  const uniq = (xs: string[]) => [...new Set(xs)].join(" + ");
  const bc = boxRows("COLETA", s.clienteColeta.nome, coletas.length > 1 ? `${coletas.length} locais: ${uniq(coletas.map((l) => l.nome))}` : coletas[0].nome, uniq(coletas.map((l) => `${l.cidade}/${l.uf}`)));
  const bd = boxRows("DESCARGA", s.clienteDescarga.nome, s.descarga.local.nome, `${s.descarga.local.cidade}/${s.descarga.local.uf}`);
  const boxH = (rows: typeof bc) => 34 + rows.reduce((t, [, ls]) => t + 12 + ls.length * 13 + 4, 0);
  const bh = Math.max(boxH(bc), boxH(bd));
  ensure(bh + 10);
  const boxTop = y;
  const box = (x: number, titulo: string, rows: typeof bc) => {
    page.drawRectangle({ x, y: boxTop - bh, width: half, height: bh, borderColor: ORANGE, borderWidth: 1.5 });
    let yy = boxTop - 18;
    page.drawText(titulo, { x: x + 10, y: yy, size: 10, font: bold, color: ORANGE }); yy -= 18;
    for (const [k, ls] of rows) {
      page.drawText(clean(`${k}:`), { x: x + 10, y: yy, size: 8, font, color: GRAY }); yy -= 13;
      for (const l of ls) { page.drawText(l, { x: x + 10, y: yy, size: 11, font: bold }); yy -= 13; }
      yy -= 4;
    }
  };
  box(M, "COLETA", bc); box(M + half + 10, "DESCARGA", bd);
  y = boxTop - bh - 14;
  text(`Contratante do frete: ${s.contratante.nome}`, { size: 9, color: GRAY });

  section("Endereços e horários");
  for (const l of coletas) {
    const qtd = s.nfs.filter((n) => (n.coletaLocalId ?? s.coleta.local.id) === l.id).length;
    text(`Coleta - ${l.nome} (${qtd} NF)`, { b: true }); text(l.endereco, { size: 9 });
    if (l.contatos) text(`Contato: ${l.contatos}`, { size: 9, color: GRAY });
  }
  text(`Data/hora da coleta: ${fmtDataHora(s.coleta.dataHora)}`, { size: 10, b: true }); y -= 4;
  text(`Descarga - ${s.descarga.local.nome}`, { b: true }); text(s.descarga.local.endereco, { size: 9 });
  if (s.descarga.local.contatos) text(`Contato: ${s.descarga.local.contatos}`, { size: 9, color: GRAY });
  text(`Previsão de descarga: ${fmtDataHora(s.descarga.dataHora)}`, { size: 10, b: true });

  section("Motorista e veículo");
  text(`Motorista: ${s.motorista.nome} · CPF ${s.motorista.cpf} · Tel. ${s.motorista.telefone}`);
  text(`Veículo: placa ${s.veiculo.placa} · ${s.veiculo.tipo}`);

  section(`Notas fiscais (${s.nfs.length}) · ${s.totais.peso.toLocaleString("pt-BR")} kg · ${s.totais.volumes} volumes`);
  const cols = [{ t: "NF", w: 50 }, { t: "Local de coleta", w: 115 }, { t: "Remetente", w: 120 }, { t: "Destinatário", w: 120 }, { t: "Volumes", w: 45 }, { t: "Peso (kg)", w: CW - 450 }];
  const row = (vals: string[], b = false) => {
    const lines = vals.map((v, i) => wrap(v, b ? bold : font, 8, cols[i].w - 6));
    const h = Math.max(...lines.map((l) => l.length)) * 10 + 6; ensure(h);
    if (b) page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: rgb(0.93, 0.93, 0.93) });
    const f = b ? bold : font;
    let x = M; lines.forEach((ls, i) => { ls.forEach((l, j) => { const lx = i >= 4 ? x + cols[i].w - 4 - f.widthOfTextAtSize(l, 8) : x + 4; page.drawText(l, { x: lx, y: y - 10 - j * 10, size: 8, font: f }); }); x += cols[i].w; });
    y -= h; page.drawLine({ start: { x: M, y }, end: { x: M + CW, y }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
  };
  row(cols.map((c) => c.t), true);
  onNewPage = () => { onNewPage = null; row(cols.map((c) => c.t), true); onNewPage = repeat; };
  const repeat = onNewPage;
  for (const n of s.nfs) row([n.numero, nomeLocal.get(n.coletaLocalId ?? s.coleta.local.id) ?? s.coleta.local.nome, n.remetente, n.destinatario, String(n.volumes), n.peso.toLocaleString("pt-BR")]);
  onNewPage = null;

  if (s.instrucoes) { section("Instruções"); text(s.instrucoes, { size: 9 }); }
  section("Assinaturas"); ensure(50); y -= 30;
  ["Expedição (coleta)", "Motorista", "Recebimento (descarga)"].forEach((l, i) => {
    const x = M + i * (CW / 3); page.drawLine({ start: { x: x + 5, y }, end: { x: x + CW / 3 - 10, y }, thickness: 0.6 });
    page.drawText(clean(l), { x: x + 5, y: y - 11, size: 8, font, color: GRAY });
  });
  y -= 20;
  text(`Snapshot imutável da versão ${s.versao ?? 1}. Alterações posteriores em cadastros não modificam este documento.`, { size: 7, color: GRAY });
  return await doc.save();
}

export async function sha256Hex(bytes: Uint8Array) {
  const h = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
