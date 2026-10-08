// Emissão de OC e fila de envio no servidor. Chamado somente após verificação de permissão do chamador.
import { renderOcPdf, sha256Hex, fmtDataHora } from "./oc-pdf";
import { buildSnapshot, conteudoSnapshot, type OcSnapshot } from "./oc-model";
import type { LocalOperacional, Motorista, OrdemColeta, Order, Veiculo } from "./mock-data";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function rows<T>(db: Admin, collection: string, ids?: string[]) {
  let q = db.from("app_records").select("id,data,version").eq("collection", collection);
  if (ids) q = q.in("id", ids.length ? ids : ["__none__"]);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r.data as T), __version: r.version as number }));
}

export async function emitOc(db: Admin, actor: { id: string; nome: string }, ocId: string, expectedVersion: number, enviarRevisao: boolean) {
  const [oc] = await rows<OrdemColeta>(db, "ordensColeta", [ocId]);
  if (!oc) throw new Error("OC não encontrada.");
  if (oc.__version !== expectedVersion) throw new Error("CONFLICT: a OC foi alterada por outro operador; recarregue.");
  const [nfs, locais, motoristas, veiculos] = await Promise.all([
    rows<Order>(db, "orders", oc.orderIds), rows<LocalOperacional>(db, "locais", [oc.localColetaId ?? "", oc.localDescargaId ?? ""]),
    rows<Motorista>(db, "motoristas", [oc.motoristaId ?? ""]), rows<Veiculo>(db, "veiculos", [oc.veiculoId ?? ""]),
  ]);
  const { erros, snapshot } = buildSnapshot(oc, { nfs, locais, motoristas, veiculos, emitidoPor: actor.nome });
  if (!snapshot) return { ok: false as const, erros };
  const versao = (oc.docVersion ?? 0) + 1;
  if (oc.docVersion) {
    const { data: last } = await db.from("tms_oc_documents").select("snapshot").eq("oc_id", ocId).eq("version", oc.docVersion).maybeSingle();
    if (last && conteudoSnapshot(last.snapshot as never) === conteudoSnapshot(snapshot as never)) return { ok: false as const, erros: ["Sem alteração de conteúdo: a versão atual continua válida."] };
  }
  const bytes = await renderOcPdf({ ...snapshot, versao });
  const sha = await sha256Hex(bytes);
  const path = `${ocId}/v${versao}-${sha.slice(0, 12)}.pdf`;
  const up = await db.storage.from("oc-documentos").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error && !/exists/i.test(up.error.message)) throw new Error(`Falha ao gravar o PDF: ${up.error.message}`);
  const { data, error } = await db.rpc("tms_oc_emit_worker", { p_actor: actor.id, p_oc_id: ocId, p_expected_version: expectedVersion, p_snapshot: snapshot as never, p_pdf_path: path, p_pdf_sha: sha, p_send: enviarRevisao });
  if (error) throw new Error(error.message);
  return { ok: true as const, ...(data as { docVersion: number; status: string; enfileirados: number }), pendencias: snapshot.pendenciasEnvio };
}

export function ocEmailHtml(s: OcSnapshot & { versao?: number }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111">
<p>Segue a Ordem de Coleta <b>${esc(s.numero)}</b> (documento v${s.versao ?? 1}) em anexo.</p>
<table cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
<tr><td><b>Cliente da coleta</b></td><td>${esc(s.clienteColeta.nome)}</td></tr>
<tr><td><b>Local da coleta</b></td><td>${esc(s.coleta.local.nome)} · ${esc(s.coleta.local.endereco)}</td></tr>
<tr><td><b>Coleta</b></td><td>${esc(fmtDataHora(s.coleta.dataHora))}</td></tr>
<tr><td><b>Cliente da descarga</b></td><td>${esc(s.clienteDescarga.nome)}</td></tr>
<tr><td><b>Local da descarga</b></td><td>${esc(s.descarga.local.nome)} · ${esc(s.descarga.local.endereco)}</td></tr>
<tr><td><b>Motorista / placa</b></td><td>${esc(s.motorista.nome)} · ${esc(s.motorista.telefone)} · ${esc(s.veiculo.placa)}</td></tr>
<tr><td><b>NFs</b></td><td>${s.nfs.map((n) => esc(n.numero)).join(", ")}</td></tr></table>
<p style="color:#666;font-size:12px">Novaris · Operador Logístico Integrado</p></body></html>`;
}

export type Sender = (to: string, subject: string, html: string, pdf: { name: string; base64: string }) => Promise<void>;
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

/** Processa a fila com reserva durável (SKIP LOCKED): cada destinatário/versão é enviado por uma única execução. */
export async function processOcOutbox(db: Admin, ocId: string | null, send: Sender, limit = 20) {
  const { data: claimed, error } = await db.rpc("tms_oc_email_claim", { p_oc_id: ocId as string, p_limit: limit });
  if (error) throw new Error(error.message);
  let aceitos = 0, falhas = 0, incertos = 0;
  const pdfCache = new Map<string, { snap: OcSnapshot; base64: string }>();
  for (const row of (claimed ?? []) as { id: string; oc_id: string; doc_version: number; email: string }[]) {
    try {
      const key = `${row.oc_id}:${row.doc_version}`;
      let cached = pdfCache.get(key);
      if (!cached) {
        const { data: doc, error: e1 } = await db.from("tms_oc_documents").select("snapshot,pdf_path").eq("oc_id", row.oc_id).eq("version", row.doc_version).single();
        if (e1 || !doc) throw new Error("Documento da versão não encontrado");
        const file = await db.storage.from("oc-documentos").download(doc.pdf_path);
        if (file.error || !file.data) throw new Error("PDF não encontrado no armazenamento");
        cached = { snap: doc.snapshot as unknown as OcSnapshot, base64: b64(new Uint8Array(await file.data.arrayBuffer())) };
        pdfCache.set(key, cached);
      }
      const s = { ...cached.snap, versao: row.doc_version };
      await send(row.email, `Ordem de Coleta ${s.numero} · v${row.doc_version} · ${s.coleta.local.cidade}/${s.coleta.local.uf} -> ${s.descarga.local.cidade}/${s.descarga.local.uf}`, ocEmailHtml(s), { name: `OC-${s.numero}-v${row.doc_version}.pdf`, base64: cached.base64 });
      await db.rpc("tms_oc_email_finish", { p_id: row.id, p_status: "aceito", p_error: "" }); aceitos++;
    } catch (e) {
      const incerto = e instanceof Error && e.name === "EnvioIncertoError";
      await db.rpc("tms_oc_email_finish", { p_id: row.id, p_status: incerto ? "incerto" : "falha", p_error: e instanceof Error ? e.message : "Falha no envio" });
      if (incerto) incertos++; else falhas++;
    }
  }
  return { reservados: (claimed ?? []).length, aceitos, falhas, incertos };
}

export const graphSender: Sender = async (to, subject, html, pdf) => {
  const { graphSendMail, EnvioIncertoError } = await import("./graph-mail.server");
  try { await graphSendMail(to, subject, html, [{ name: pdf.name, base64: pdf.base64, contentType: "application/pdf" }]); }
  catch (e) { if (e instanceof EnvioIncertoError) { const x = new Error(e.message); x.name = "EnvioIncertoError"; throw x; } throw e; }
};
