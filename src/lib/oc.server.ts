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
    rows<Order>(db, "orders", oc.orderIds), rows<LocalOperacional>(db, "locais", [...new Set([...oc.orderIds.map((id) => localColetaDaNf(oc, id)), oc.localColetaId ?? "", oc.localDescargaId ?? "", ...Object.values(oc.entregaPorNf ?? {})])].filter(Boolean)),
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

/** Vincula NFs chegadas depois a uma OC emitida e gera nova versão do documento, sem reenviar e-mail. */
export async function vincularNfs(db: Admin, actor: { id: string; nome: string }, ocId: string, nfIds: string[], localColetaId?: string) {
  const { data, error } = await db.rpc("tms_oc_link_nfs", { p_actor: actor.id, p_actor_nome: actor.nome, p_oc_id: ocId, p_nf_ids: nfIds });
  if (error) return { ok: false as const, erros: [error.message] };
  const r = data as { ocVersion: number; vinculadas: number };
  if (!r.vinculadas) return { ok: false as const, erros: ["Nenhuma NF nova para vincular."] };
  // Persiste o local de coleta das NFs vinculadas: o escolhido ou o local original da OC (cabeçalho/snapshot).
  let ocVersion = r.ocVersion;
  const [oc] = await rows<OrdemColeta>(db, "ordensColeta", [ocId]);
  if (oc) {
    let local = localColetaId || oc.localColetaId || Object.values(oc.coletaPorNf ?? {}).find(Boolean) || "";
    if (!local && oc.docVersion) {
      const { data: last } = await db.from("tms_oc_documents").select("snapshot").eq("oc_id", ocId).eq("version", oc.docVersion).maybeSingle();
      local = ((last?.snapshot as unknown as OcSnapshot | undefined)?.coleta?.local?.id) ?? "";
    }
    if (local) {
      const coletaPorNf = { ...(oc.coletaPorNf ?? {}) };
      for (const id of nfIds) if (oc.orderIds.includes(id)) coletaPorNf[id] = local;
      const { __version, ...dados } = oc as OrdemColeta & { __version: number };
      const novo = { ...dados, coletaPorNf, localColetaId: oc.localColetaId || local };
      const { data: upd, error: e2 } = await db.from("app_records").update({ data: novo as never, version: __version + 1 }).eq("collection", "ordensColeta").eq("id", ocId).eq("version", __version).select("version").maybeSingle();
      if (e2 || !upd) return { ok: false as const, erros: ["NF vinculada, mas não foi possível gravar o local de coleta; recarregue e use \"Gerar nova versão\"."] };
      ocVersion = upd.version as number;
    }
  }
  const e = await emitOc(db, actor, ocId, ocVersion, false);
  if (!e.ok) return { ok: false as const, erros: [`NF vinculada, mas a nova versão do PDF não foi gerada: ${e.erros.join(" ")} Use "Gerar nova versão".`] };
  return { ok: true as const, vinculadas: r.vinculadas, docVersion: e.docVersion };
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
  const placa = esc(s.veiculo.placa + (s.veiculo.placaCarreta ? ` / ${s.veiculo.placaCarreta}` : ""));
   // Estes dados pertencem à mesma OC e são iguais para todas as NFs deste armazém.
   // Mesclar só as linhas de notas; o rodapé permanece fora do rowspan.
   const compartilhados = [placa, esc(s.motorista.nome), esc(s.motorista.cpf), esc(s.veiculo.tipo), esc(s.instrucoes)]
     .map((valor) => `<td${nfs.length ? ` rowspan="${nfs.length}"` : ""} style="${td};vertical-align:middle">${valor}</td>`).join("");
   const linhas = nfs.length
     ? nfs.map((n, index) => `<tr><td style="${td}">${esc(n.numero)}</td>${index === 0 ? compartilhados : ""}<td style="${td}">${esc(fmtExtenso(n.coletaDataHora || s.coleta.dataHora))}</td></tr>`).join("")
     : `<tr><td style="${td}">A informar após a coleta</td>${compartilhados}<td style="${td}">${esc(fmtExtenso(s.coleta.dataHora))}</td></tr>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111">
<p>Olá equipe, uma nova solicitação de carregamento foi feita, confira abaixo:</p>
<h2 style="margin:16px 0 8px">Informações Gerais</h2>
<p style="margin:4px 0"><b>ID:</b> ${esc(s.numero)}.</p>
<p style="margin:4px 0"><b>Data do preenchimento:</b> ${esc(fmtExtenso(s.emitidoEm))}.</p>
<h3 style="text-align:center;color:#5a4a42;font-size:20px;margin:12px 0">Tabela de entregas</h3>
<table cellspacing="0" style="border-collapse:collapse;width:100%">
<tr><th style="${th}">NF</th><th style="${th}">Placas</th><th style="${th}">Motorista</th><th style="${th}">CPF</th><th style="${th}">Tipo de veículo</th><th style="${th}">Observações</th><th style="${th}">Previsão de chegada</th></tr>
${linhas}
<tr><td style="${td}">Entregas: ${nfs.length}</td><td style="${td}">Peso total: ${peso.toLocaleString("pt-BR")}kg</td><td colspan="5" style="${td}">Criado por: ${esc(s.emitidoPor)}</td></tr>
</table>
<p style="margin-top:28px">Atenciosamente;<br><b>Equipe de Monitoramento ${esc(s.empresa?.nome ?? "Novaris")}.</b>${s.empresa?.telefone || s.empresa?.email ? `<br>${esc([s.empresa?.telefone, s.empresa?.email].filter(Boolean).join(" · "))}` : ""}<br><i>Esta mensagem é enviada automaticamente pelo TMS.</i></p></body></html>`;
}

export type Sender = (remetente: string, to: string[], subject: string, html: string) => Promise<void>;

type OutRow = { id: string; oc_id: string; doc_version: number; email: string; papeis: string[] };
/** Processa a fila com reserva durável (SKIP LOCKED). Destinatários do mesmo armazém/versão recebem UM único e-mail juntos. */
export async function processOcOutbox(db: Admin, ocId: string | null, send: Sender, limit = 200) {
  const { data: claimed, error } = await db.rpc("tms_oc_email_claim", { p_oc_id: ocId as string, p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (claimed ?? []) as OutRow[];
  const snapCache = new Map<string, OcSnapshot>();
  // Grupo = OC + versão + armazém de coleta (ou papéis gerais quando não há armazém).
  const grupos = new Map<string, { key: string; papeis: string[]; rows: OutRow[] }>();
  for (const row of rows) {
    const locais = (row.papeis ?? []).filter((p) => p.startsWith("coleta:"));
    for (const papeis of locais.length ? locais.map((p) => [p]) : [["geral"]]) {
      const g = `${row.oc_id}:${row.doc_version}:${papeis[0]}`;
      const atual = grupos.get(g) ?? { key: `${row.oc_id}:${row.doc_version}`, papeis: papeis[0] === "geral" ? row.papeis ?? [] : papeis, rows: [] };
      atual.rows.push(row); grupos.set(g, atual);
    }
  }
  const erroPorLinha = new Map<string, { msg: string; incerto: boolean }>();
  for (const g of grupos.values()) {
    try {
      let snap = snapCache.get(g.key);
      if (!snap) {
        const [oc, ver] = [g.rows[0].oc_id, g.rows[0].doc_version];
        const { data: doc, error: e1 } = await db.from("tms_oc_documents").select("snapshot").eq("oc_id", oc).eq("version", ver).single();
        if (e1 || !doc) throw new Error("Documento da versão não encontrado");
        snap = doc.snapshot as unknown as OcSnapshot; snapCache.set(g.key, snap);
      }
      const s = { ...snap, versao: g.rows[0].doc_version };
      const nfs = nfsDoDestinatario(s, g.papeis);
      if (!nfs.length && s.nfs.length) continue;
      const localId = g.papeis[0]?.startsWith("coleta:") ? g.papeis[0].slice(7) : "";
      const nomeLocal = (localId && (s.nfs.find((n) => n.coletaLocalId === localId) as { coletaLocalNome?: string } | undefined)?.coletaLocalNome) || "";
      const to = [...new Set(g.rows.map((r) => r.email.toLowerCase()))];
      await send(s.empresa?.id ?? "", to, `Solicitação de carregamento · ${s.numero}${nomeLocal ? ` · ${nomeLocal}` : ""} · ${nfs.length} NF(s) · ${s.veiculo.placa}${s.veiculo.placaCarreta ? ` / ${s.veiculo.placaCarreta}` : ""}`, ocEmailHtml(s, nfs));
    } catch (e) {
      const incerto = e instanceof Error && e.name === "EnvioIncertoError";
      for (const r of g.rows) erroPorLinha.set(r.id, { msg: e instanceof Error ? e.message : "Falha no envio", incerto });
    }
  }
  let aceitos = 0, falhas = 0, incertos = 0;
  for (const row of rows) {
    const err = erroPorLinha.get(row.id);
    await db.rpc("tms_oc_email_finish", { p_id: row.id, p_status: err ? (err.incerto ? "incerto" : "falha") : "aceito", p_error: err?.msg ?? "" });
    if (!err) aceitos++; else if (err.incerto) incertos++; else falhas++;
  }
  return { reservados: rows.length, aceitos, falhas, incertos };
}

/** Remetente = empresa emissora da OC (Microsoft 365 ou SMTP próprio). */
export const graphSender: Sender = async (empresaId, to, subject, html) => {
  const { sendAsEmpresa } = await import("./company-mail.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await sendAsEmpresa(supabaseAdmin as never, empresaId, to, subject, html);
};
