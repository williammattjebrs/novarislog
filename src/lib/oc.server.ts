// Emissão de OC e fila de envio no servidor. Chamado somente após verificação de permissão do chamador.
import { renderOcPdf, sha256Hex, fmtDataHora } from "./oc-pdf";
import { buildSnapshot, conteudoSnapshot, localColetaDaNf, type OcSnapshot } from "./oc-model";
import type { Empresa, LocalOperacional, Motorista, OrdemColeta, Order, Veiculo } from "./mock-data";

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
  const [nfs, locais, motoristas, veiculos, empresas] = await Promise.all([
    rows<Order>(db, "orders", oc.orderIds), rows<LocalOperacional>(db, "locais", [...new Set([...oc.orderIds.map((id) => localColetaDaNf(oc, id)), oc.localDescargaId ?? ""])].filter(Boolean)),
    rows<Motorista>(db, "motoristas", [oc.motoristaId ?? ""]), rows<Veiculo>(db, "veiculos", [oc.veiculoId ?? ""]),
    rows<Empresa>(db, "companies"),
  ]);
  const { erros, snapshot } = buildSnapshot(oc, { nfs, locais, motoristas, veiculos, empresas, emitidoPor: actor.nome });
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

const fmtExtenso = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "a definir");
/** NFs que cabem a um destinatário: as dos locais de coleta ligados ao e-mail (snapshots antigos: todas). */
export function nfsDoDestinatario(s: OcSnapshot, papeis: string[]) {
  const locais = papeis.filter((p) => p.startsWith("coleta:")).map((p) => p.slice(7));
  return locais.length ? s.nfs.filter((n) => locais.includes(n.coletaLocalId ?? s.coleta.local.id)) : s.nfs;
}
/** Solicitação de carregamento ao armazém de coleta: tabela no corpo, sem anexo (modelo operacional RTM/Novaris). */
export function ocEmailHtml(s: OcSnapshot & { versao?: number }, nfs = s.nfs) {
  const th = "background:#F7841E;color:#111;padding:8px 10px;border:1px solid #ddd;font-weight:bold;text-align:center";
  const td = "padding:8px 10px;border:1px solid #ddd;text-align:center;font-weight:bold;font-size:13px";
  const peso = nfs.reduce((t, n) => t + n.peso, 0);
  const placa = esc(s.veiculo.placa);
  const linhas = nfs.map((n) => `<tr><td style="${td}">${esc(n.numero)}</td><td style="${td}">${placa}</td><td style="${td}">${esc(s.motorista.nome)}</td><td style="${td}">${esc(s.motorista.cpf)}</td><td style="${td}">${esc(s.veiculo.tipo)}</td><td style="${td}">${esc(fmtExtenso(s.coleta.dataHora))}</td><td style="${td}">${esc(s.instrucoes)}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111">
<p>Olá equipe, uma nova solicitação de carregamento foi feita, confira abaixo:</p>
<h2 style="margin:16px 0 8px">Informações Gerais</h2>
<p style="margin:4px 0"><b>ID:</b> ${esc(s.numero)}.</p>
<p style="margin:4px 0"><b>Data do preenchimento:</b> ${esc(fmtExtenso(s.emitidoEm))}.</p>
<h3 style="text-align:center;color:#5a4a42;font-size:20px;margin:12px 0">Tabela de entregas</h3>
<table cellspacing="0" style="border-collapse:collapse;width:100%">
<tr><th style="${th}">NF</th><th style="${th}">Placas</th><th style="${th}">Motorista</th><th style="${th}">CPF</th><th style="${th}">Tipo de veículo</th><th style="${th}">Previsão de chegada</th><th style="${th}">Observações</th></tr>
${linhas}
<tr><td style="${td}">Entregas: ${nfs.length}</td><td style="${td}">Peso total: ${peso.toLocaleString("pt-BR")}kg</td><td colspan="5" style="${td}">Criado por: ${esc(s.emitidoPor)}</td></tr>
</table>
<p style="margin-top:28px">Atenciosamente;<br><b>Equipe de Monitoramento ${esc(s.empresa?.nome ?? "Novaris")}.</b>${s.empresa?.telefone || s.empresa?.email ? `<br>${esc([s.empresa?.telefone, s.empresa?.email].filter(Boolean).join(" · "))}` : ""}<br><i>Esta mensagem é enviada automaticamente pelo TMS.</i></p></body></html>`;
}

export type Sender = (to: string, subject: string, html: string) => Promise<void>;

/** Processa a fila com reserva durável (SKIP LOCKED): cada destinatário/versão é enviado por uma única execução. */
export async function processOcOutbox(db: Admin, ocId: string | null, send: Sender, limit = 20) {
  const { data: claimed, error } = await db.rpc("tms_oc_email_claim", { p_oc_id: ocId as string, p_limit: limit });
  if (error) throw new Error(error.message);
  let aceitos = 0, falhas = 0, incertos = 0;
  const snapCache = new Map<string, OcSnapshot>();
  for (const row of (claimed ?? []) as { id: string; oc_id: string; doc_version: number; email: string; papeis: string[] }[]) {
    try {
      const key = `${row.oc_id}:${row.doc_version}`;
      let snap = snapCache.get(key);
      if (!snap) {
        const { data: doc, error: e1 } = await db.from("tms_oc_documents").select("snapshot").eq("oc_id", row.oc_id).eq("version", row.doc_version).single();
        if (e1 || !doc) throw new Error("Documento da versão não encontrado");
        snap = doc.snapshot as unknown as OcSnapshot; snapCache.set(key, snap);
      }
      const s = { ...snap, versao: row.doc_version };
      // Um e-mail por armazém de coleta, mesmo quando o mesmo endereço atende mais de um local.
      const locaisColeta = (row.papeis ?? []).filter((p) => p.startsWith("coleta:"));
      const grupos = locaisColeta.length ? locaisColeta.map((p) => [p]) : [row.papeis ?? []];
      for (const papeis of grupos) {
        const nfs = nfsDoDestinatario(s, papeis);
        if (!nfs.length) continue;
        const localId = papeis[0]?.startsWith("coleta:") ? papeis[0].slice(7) : "";
        const nomeLocal = (localId && (s.nfs.find((n) => n.coletaLocalId === localId) as { coletaLocalNome?: string } | undefined)?.coletaLocalNome) || "";
        await send(row.email, `Solicitação de carregamento · ${s.numero}${nomeLocal ? ` · ${nomeLocal}` : ""} · ${nfs.length} NF(s) · ${s.veiculo.placa}`, ocEmailHtml(s, nfs));
      }
      await db.rpc("tms_oc_email_finish", { p_id: row.id, p_status: "aceito", p_error: "" }); aceitos++;
    } catch (e) {
      const incerto = e instanceof Error && e.name === "EnvioIncertoError";
      await db.rpc("tms_oc_email_finish", { p_id: row.id, p_status: incerto ? "incerto" : "falha", p_error: e instanceof Error ? e.message : "Falha no envio" });
      if (incerto) incertos++; else falhas++;
    }
  }
  return { reservados: (claimed ?? []).length, aceitos, falhas, incertos };
}

export const graphSender: Sender = async (to, subject, html) => {
  const { graphSendMail, EnvioIncertoError } = await import("./graph-mail.server");
  try { await graphSendMail(to, subject, html); }
  catch (e) { if (e instanceof EnvioIncertoError) { const x = new Error(e.message); x.name = "EnvioIncertoError"; throw x; } throw e; }
};
