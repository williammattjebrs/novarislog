// Ordens de coleta: rascunho → programação → emissão no servidor (PDF + fila de envio) → execução no Monitoramento.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Send, X, RefreshCw, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/Timeline";
import { MotoristaSelect, VeiculoSelect, CapacidadeAlerta } from "@/components/FleetSelects";
import { LocalSelect } from "@/components/CriarOcPanel";
import { useClients, useLocais, useMotoristas, useOrders, useOrdensColeta, useVeiculos } from "@/lib/mock-store";
import { OC_STATUS, type OrdemColeta, type Order } from "@/lib/mock-data";
import { destinatariosOc, isV2, ocAtivaDaNf, previewConversao, validarEmissao, OC_EMITIDAS } from "@/lib/oc-model";
import { aplicarStatusOc, salvarOc } from "@/lib/oc-actions";
import { commitLists, getList, getVersion, refreshShared } from "@/lib/shared-db";
import { emitirOC, enviarAgoraOC, linkPdfOC, reenfileirarEnvios } from "@/lib/oc.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDataHora } from "@/lib/oc-pdf";

export const Route = createFileRoute("/ordens-coleta")({
  validateSearch: (s: Record<string, unknown>): { registro?: string } => ({ registro: typeof s.registro === "string" ? s.registro : undefined }),
  head: () => ({ meta: [
    { title: "Ordens de coleta | Novaris TMS" },
    { name: "description", content: "Programação, emissão com PDF, envio aos locais e motorista e versões das ordens de coleta." },
    { property: "og:title", content: "Ordens de coleta | Novaris TMS" },
    { property: "og:description", content: "Rascunho, programação e emissão das ordens de coleta com documento PDF versionado." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/ordens-coleta"><AppShell><Page /></AppShell></RoleGate>,
});

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const label = (oc: OrdemColeta) => { const l = OC_STATUS.find((s) => s.id === oc.status)?.label ?? oc.status; return isV2(oc) || l.startsWith("Legado") ? l : `Legado · ${l}`; };

function Page() {
  const ocs = useOrdensColeta(); const { registro } = Route.useSearch();
  const [sel, setSel] = useState<string | null>(registro ?? null);
  useEffect(() => { if (registro) setSel(registro); }, [registro]);
  const [filtro, setFiltro] = useState<"ativas" | "rascunho" | "emitidas" | "legado" | "todas">("ativas");
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const lista = ocs.list.filter((o) => {
    const f = filtro === "todas" || (filtro === "ativas" && o.status !== "cancelada" && o.status !== "entregue") || (filtro === "rascunho" && isV2(o) && o.status === "rascunho") || (filtro === "emitidas" && isV2(o) && OC_EMITIDAS.includes(o.status)) || (filtro === "legado" && !isV2(o));
    return f && (!q || [o.numero, o.clienteNome, o.clienteColetaNome, o.clienteDescargaNome, o.localColeta, o.localEntrega].join(" ").toLowerCase().includes(q));
  });
  const legados = ocs.list.filter((o) => !isV2(o)).length;
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display">Ordens de coleta</h1>
        <p className="text-sm text-muted-foreground">Rascunhos criados em Rotas são programados aqui. Só a emissão gera o PDF, coloca a OC no Monitoramento e enfileira o envio aos locais e ao motorista.</p>
      </div>
      {legados > 0 && <ConversaoLegado />}
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <select aria-label="Filtro" className="bg-input/40 border border-border rounded px-2 py-1" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="ativas">Ativas</option><option value="rascunho">Rascunhos</option><option value="emitidas">Emitidas</option><option value="legado">Legadas (a converter)</option><option value="todas">Todas</option>
        </select>
        <input className="input max-w-xs" placeholder="Buscar OC, cliente, local" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="text-xs text-muted-foreground">{lista.length} OC</span>
      </div>
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border"><th className="p-2">OC</th><th>Cliente coleta → descarga</th><th>Locais</th><th>Coleta</th><th>NFs</th><th>Documento</th><th>Status</th></tr></thead>
          <tbody>
            {lista.map((oc) => (
              <Fragment key={oc.id}>
                <tr onClick={() => setSel(oc.id)} className={`border-b border-border cursor-pointer hover:bg-elevated/50 ${sel === oc.id ? "bg-elevated/60" : ""}`}>
                  <td className="p-2 num text-primary">{oc.numero}</td>
                  <td className="text-xs">{oc.clienteColetaNome ?? oc.clienteNome} → {oc.clienteDescargaNome ?? "—"}</td>
                  <td className="text-xs">{oc.localColeta || "—"} ({oc.cidadeColeta}/{oc.ufColeta}) → {oc.localEntrega || "—"} ({oc.cidadeEntrega}/{oc.ufEntrega})</td>
                  <td className="text-xs">{fmtDataHora(oc.dataHoraColeta)}</td>
                  <td className="text-xs">{oc.orderIds.length}</td>
                  <td className="text-xs">{oc.docVersion ? `v${oc.docVersion}${oc.conteudoPendenteRevisao ? " · revisão pendente" : ""}` : oc.documentoEstado === "legado_sem_snapshot" ? "legado sem PDF" : "—"}</td>
                  <td className="text-xs">{label(oc)}</td>
                </tr>
                {sel === oc.id && <tr aria-label={`Edição de ${oc.numero}`}><td colSpan={7} className="p-0 bg-elevated/20"><OcDetalhe key={oc.id} ocId={oc.id} onClose={() => setSel(null)} /></td></tr>}
              </Fragment>
            ))}
            {!lista.length && <tr><td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">Nenhuma OC. Selecione NFs em <Link to="/rotas" className="text-primary">Rotas</Link> para criar um rascunho.</td></tr>}
          </tbody>
        </table>
      </div>
      {sel && !lista.some((o) => o.id === sel) && ocs.list.some((o) => o.id === sel) && <OcDetalhe key={sel} ocId={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function OcDetalhe({ ocId, onClose }: { ocId: string; onClose: () => void }) {
  const ocs = useOrdensColeta(); const orders = useOrders(); const locais = useLocais(); const mot = useMotoristas(); const vei = useVeiculos(); const clients = useClients();
  const { user } = useAuth(); const autor = user?.nome ?? "usuário";
  const oc = ocs.list.find((o) => o.id === ocId)!;
  const emitir = useServerFn(emitirOC); const pdfLink = useServerFn(linkPdfOC); const requeue = useServerFn(reenfileirarEnvios); const enviarAgora = useServerFn(enviarAgoraOC);
  const init = () => ({ motoristaId: oc.motoristaId ?? "", veiculoId: oc.veiculoId ?? "", clienteColetaId: oc.clienteColetaId ?? "", clienteColetaNome: oc.clienteColetaNome ?? oc.clienteNome, localColetaId: oc.localColetaId ?? "", clienteDescargaNome: oc.clienteDescargaNome ?? "", localDescargaId: oc.localDescargaId ?? "", contratanteNome: oc.contratanteNome ?? "", dataHoraColeta: toLocal(oc.dataHoraColeta), dataHoraEntrega: toLocal(oc.dataHoraEntrega), instrucoes: oc.instrucoes ?? oc.observacao ?? "", orderIds: oc.orderIds });
  const [f, setF] = useState(init);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [busy, setBusy] = useState(false); const [enviarRev, setEnviarRev] = useState(false);
  const [docs, setDocs] = useState<{ version: number; created_at: string; pdf_sha256: string; send_requested: boolean; snapshot: any }[]>([]);
  const [envios, setEnvios] = useState<{ id: string; doc_version: number; email: string; papeis: string[]; status: string; attempts: number; last_error: string | null; accepted_at: string | null }[]>([]);
  const painel = useRef<HTMLDivElement>(null);
  // Ao abrir a edição, garante que o painel fique visível na tela (abre logo abaixo da OC clicada).
  useEffect(() => { painel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []);
  const editavel = isV2(oc) && !["cancelada", "entregue"].includes(oc.status);
  const emitida = isV2(oc) && OC_EMITIDAS.includes(oc.status);
  async function loadDocs() {
    const [d, e] = await Promise.all([
      supabase.from("tms_oc_documents").select("version,created_at,pdf_sha256,send_requested,snapshot").eq("oc_id", ocId).order("version", { ascending: false }),
      supabase.from("tms_oc_email_outbox").select("id,doc_version,email,papeis,status,attempts,last_error,accepted_at").eq("oc_id", ocId).order("doc_version", { ascending: false }),
    ]);
    setDocs((d.data ?? []) as never); setEnvios((e.data ?? []) as never);
  }
  useEffect(() => { void loadDocs(); }, [ocId, oc.docVersion]);
  const draft: OrdemColeta = { ...oc, ...f, clienteColetaId: f.clienteColetaId || undefined, motoristaId: f.motoristaId || undefined, veiculoId: f.veiculoId || undefined, localColetaId: f.localColetaId || undefined, localDescargaId: f.localDescargaId || undefined, dataHoraColeta: f.dataHoraColeta ? new Date(f.dataHoraColeta).toISOString() : "", dataHoraEntrega: f.dataHoraEntrega ? new Date(f.dataHoraEntrega).toISOString() : "" };
  const dirty = JSON.stringify(f) !== JSON.stringify(init());
  const nfs = f.orderIds.map((id) => orders.list.find((n) => n.id === id)).filter(Boolean) as Order[];
  const livres = orders.list.filter((n) => !f.orderIds.includes(n.id) && !ocAtivaDaNf(ocs.list, n.id));
  const lc = locais.list.find((l) => l.id === f.localColetaId); const ld = locais.list.find((l) => l.id === f.localDescargaId); const m = mot.list.find((x) => x.id === f.motoristaId);
  const dest = destinatariosOc(lc, ld, m);
  const val = validarEmissao(draft, { nfs: orders.list, locais: locais.list, motoristas: mot.list, veiculos: vei.list });

  async function salvar() {
    if (!f.orderIds.length) return setMsg({ tipo: "erro", texto: "A OC precisa de ao menos uma NF." });
    setBusy(true); setMsg(null);
    try {
      await salvarOc(oc, { ...draft, localColeta: lc?.nome ?? oc.localColeta, cidadeColeta: lc?.cidade ?? oc.cidadeColeta, ufColeta: lc?.uf ?? oc.ufColeta, localEntrega: ld?.nome ?? oc.localEntrega, cidadeEntrega: ld?.cidade ?? oc.cidadeEntrega, ufEntrega: ld?.uf ?? oc.ufEntrega, clienteNome: f.clienteColetaNome, conteudoPendenteRevisao: emitida ? true : oc.conteudoPendenteRevisao },
        autor, emitida ? "Conteúdo alterado após emissão · gere nova versão para atualizar o documento" : "Programação salva (rascunho)");
      setMsg({ tipo: "ok", texto: emitida ? "Alterações salvas. O documento emitido não mudou: gere uma nova versão quando quiser." : "Rascunho salvo." });
    } catch (e) { setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao salvar." }); }
    finally { setBusy(false); }
  }
  async function doEmitir() {
    if (dirty) return setMsg({ tipo: "erro", texto: "Salve as alterações antes de emitir." });
    if (!oc.docVersion && !confirm(`Emitir ${oc.numero}?\n\nO e-mail será enfileirado para:\n${dest.destinatarios.map((d) => `• ${d.email} (${d.papeis.join(", ")})`).join("\n") || "(nenhum destinatário)"}${dest.pendencias.length ? `\n\nPendências: ${dest.pendencias.join("; ")}` : ""}`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await emitir({ data: { ocId: oc.id, version: getVersion("ordensColeta", oc.id), enviarRevisao: !!oc.docVersion && enviarRev } });
      await refreshShared(); await loadDocs();
      if (!r.ok) setMsg({ tipo: "erro", texto: r.erros.join(" ") });
      else setMsg({ tipo: "ok", texto: `Documento v${r.docVersion} emitido e gravado. ${r.enfileirados} envio(s) na fila (não enviados ainda).${r.pendencias.length ? ` Pendência: ${r.pendencias.join("; ")}.` : ""}` });
    } catch (e) { setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha na emissão." }); }
    finally { setBusy(false); }
  }
  async function cancelar() {
    const motivo = prompt(`Motivo do cancelamento da ${oc.numero}? As NFs voltam para a fila de Rotas.`);
    if (!motivo?.trim()) return;
    setBusy(true);
    try { await aplicarStatusOc(oc, "cancelada", `OC cancelada · ${motivo.trim()} · NFs liberadas para reprogramação`, autor); setMsg({ tipo: "ok", texto: "OC cancelada; NFs liberadas." }); }
    catch (e) { setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao cancelar." }); }
    finally { setBusy(false); }
  }
  async function abrirPdf(version: number) {
    try { const { url } = await pdfLink({ data: { ocId: oc.id, version } }); window.open(url, "_blank", "noopener"); }
    catch (e) { setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao abrir PDF." }); }
  }
  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-display text-lg">{oc.numero}</h2>
        <span className="text-xs px-2 py-0.5 rounded border border-primary/40 text-primary">{label(oc)}</span>
        {oc.docVersion ? <span className="text-xs">Documento v{oc.docVersion}</span> : null}
        {oc.conteudoPendenteRevisao && <span className="text-xs text-warning">Conteúdo alterado após a emissão</span>}
        <button className="ml-auto" aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      {!isV2(oc) && <p className="text-sm text-warning">Registro legado (criado automaticamente pela rota). Use a prévia de conversão acima; sem conversão confirmada ele não é emitido nem monitorado.</p>}
      {oc.documentoEstado === "legado_sem_snapshot" && <p className="text-xs text-warning">Convertido de legado: não existe PDF histórico. Gere a primeira versão somente se quiser um documento a partir de agora (envio só na emissão inicial).</p>}

      {isV2(oc) && <>
        <div className="grid md:grid-cols-2 gap-3">
          <fieldset className="space-y-2" disabled={!editavel}><legend className="text-xs font-semibold text-primary">Coleta</legend>
            <select aria-label="Cliente cadastrado da coleta" className={inp} value={f.clienteColetaId} onChange={(e) => { const c = clients.list.find((x) => x.id === e.target.value); setF({ ...f, clienteColetaId: e.target.value, clienteColetaNome: c?.nome ?? f.clienteColetaNome }); }}>
              <option value="">Cliente cadastrado (opcional)…</option>{clients.list.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input aria-label="Cliente da coleta" className={inp} placeholder="Cliente da coleta (dono da carga)" value={f.clienteColetaNome} onChange={(e) => setF({ ...f, clienteColetaNome: e.target.value })} />
            <LocalSelect label="Local da coleta" value={f.localColetaId} clienteId={f.clienteColetaId} onChange={(id) => setF({ ...f, localColetaId: id })} />
            <label className="text-xs block">Data e hora da coleta<input aria-label="Data e hora da coleta" type="datetime-local" className={inp} value={f.dataHoraColeta} onChange={(e) => setF({ ...f, dataHoraColeta: e.target.value })} /></label>
          </fieldset>
          <fieldset className="space-y-2" disabled={!editavel}><legend className="text-xs font-semibold text-primary">Descarga</legend>
            <input aria-label="Cliente da descarga" className={inp} placeholder="Cliente da descarga" value={f.clienteDescargaNome} onChange={(e) => setF({ ...f, clienteDescargaNome: e.target.value })} />
            <LocalSelect label="Local da descarga" value={f.localDescargaId} onChange={(id) => setF({ ...f, localDescargaId: id })} />
            <label className="text-xs block">Previsão de descarga<input aria-label="Previsão de descarga" type="datetime-local" className={inp} value={f.dataHoraEntrega} onChange={(e) => setF({ ...f, dataHoraEntrega: e.target.value })} /></label>
            <input aria-label="Contratante do frete" className={inp} placeholder="Contratante do frete" value={f.contratanteNome} onChange={(e) => setF({ ...f, contratanteNome: e.target.value })} />
          </fieldset>
        </div>
        {editavel && <div className="grid md:grid-cols-2 gap-2">
          <MotoristaSelect value={f.motoristaId} onChange={(id) => setF({ ...f, motoristaId: id })} />
          <VeiculoSelect value={f.veiculoId} onChange={(id) => setF({ ...f, veiculoId: id })} />
        </div>}
        <CapacidadeAlerta veiculoId={f.veiculoId} pesoKg={nfs.reduce((s, n) => s + (n.peso || 0), 0)} />
        <textarea aria-label="Instruções" disabled={!editavel} className={inp} rows={2} placeholder="Instruções para coleta/descarga" value={f.instrucoes} onChange={(e) => setF({ ...f, instrucoes: e.target.value })} />
        <div>
          <div className="text-xs font-semibold mb-1">NFs ({nfs.length}) · {nfs.reduce((s, n) => s + (n.peso || 0), 0).toLocaleString("pt-BR")} kg · {nfs.reduce((s, n) => s + (n.volumes || 0), 0)} vol</div>
          <div className="space-y-1 text-xs">
            {nfs.map((n) => <div key={n.id} className="flex gap-2 items-center"><span className="num">NF {n.numeroNFe}</span><span className="text-muted-foreground">{n.remetente} → {n.destinatario}</span>{editavel && oc.status === "rascunho" && <button className="text-danger ml-auto" onClick={() => setF({ ...f, orderIds: f.orderIds.filter((x) => x !== n.id) })}>remover</button>}</div>)}
          </div>
          {editavel && oc.status === "rascunho" && livres.length > 0 && <select aria-label="Adicionar NF" className={inp + " mt-2"} value="" onChange={(e) => e.target.value && setF({ ...f, orderIds: [...f.orderIds, e.target.value] })}>
            <option value="">+ Adicionar NF sem OC…</option>{livres.slice(0, 300).map((n) => <option key={n.id} value={n.id}>NF {n.numeroNFe} · {n.remetente} → {n.destinatario}</option>)}
          </select>}
        </div>
        <div className="rounded border border-border p-3 text-xs space-y-1">
          <div className="font-semibold">Destinatários do envio {oc.docVersion ? "(somente se solicitar envio da revisão)" : "(enfileirados na primeira emissão)"}</div>
          {dest.destinatarios.map((d) => <div key={d.email}>{d.email} · {d.papeis.join(", ")}</div>)}
          {!dest.destinatarios.length && <div className="text-warning">Nenhum destinatário com e-mail.</div>}
          {dest.pendencias.map((p) => <div key={p} className="text-warning">Pendência: {p} (a emissão não é bloqueada)</div>)}
        </div>
        {editavel && val.erros.length > 0 && <ul className="text-xs text-warning list-disc pl-4">{val.erros.map((e) => <li key={e}>{e}</li>)}</ul>}
        {msg && <div role="status" className={`text-sm ${msg.tipo === "ok" ? "text-success" : "text-danger"}`}>{msg.texto}</div>}
        <div className="flex flex-wrap gap-2">
          {editavel && <Button variant="outline" disabled={busy || !dirty} onClick={salvar}>{busy ? "Gravando…" : "Salvar"}</Button>}
          {editavel && oc.status === "rascunho" && <Button disabled={busy || dirty || val.erros.length > 0} onClick={doEmitir}><FileText className="h-4 w-4" /> Emitir OC</Button>}
          {editavel && emitida && <>
            <Button disabled={busy || dirty || val.erros.length > 0 || (!!oc.docVersion && !oc.conteudoPendenteRevisao)} onClick={doEmitir}><FileText className="h-4 w-4" /> {oc.docVersion ? "Gerar nova versão" : "Gerar documento"}</Button>
            {!!oc.docVersion && <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={enviarRev} onChange={(e) => setEnviarRev(e.target.checked)} /> enviar a revisão aos destinatários</label>}
          </>}
          {editavel && <Button variant="outline" disabled={busy} onClick={cancelar}><Ban className="h-4 w-4" /> Cancelar OC</Button>}
          {emitida && <Link to="/monitoramento" search={{ registro: oc.id }} className="text-xs text-primary self-center">ver no Monitoramento →</Link>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold mb-1">Documentos emitidos</div>
            {docs.map((d) => <div key={d.version} className="text-xs flex items-center gap-2 border-t border-border py-1"><span>v{d.version}</span><span className="text-muted-foreground">{fmtDataHora(d.created_at)} · sha {d.pdf_sha256.slice(0, 10)} · {d.send_requested ? "com envio" : "sem envio"}</span><Button size="sm" variant="outline" className="ml-auto" onClick={() => abrirPdf(d.version)}>PDF</Button></div>)}
            {!docs.length && <div className="text-xs text-muted-foreground">Nenhum documento emitido.</div>}
          </div>
          <div>
            <div className="text-xs font-semibold mb-1 flex items-center gap-2">Envios
              {envios.some((e) => ["falha", "incerto"].includes(e.status)) && <Button size="sm" variant="outline" onClick={async () => { const v = envios.find((e) => ["falha", "incerto"].includes(e.status))!.doc_version; if (envios.some((e) => e.status === "incerto") && !confirm("Há envios com resultado incerto: o provedor pode ter aceitado. Reenfileirar mesmo assim?")) return; const r = await requeue({ data: { ocId: oc.id, version: v } }); setMsg({ tipo: "ok", texto: `${r.reenfileirados} envio(s) reenfileirado(s).` }); await loadDocs(); }}><RefreshCw className="h-3 w-3" /> Reenfileirar falhas</Button>}
              {envios.some((e) => e.status === "pendente") && <Button size="sm" variant="outline" onClick={async () => { if (!confirm("Enviar agora os e-mails pendentes desta OC pela conta Microsoft conectada? (e-mail real)")) return; try { const r = await enviarAgora({ data: { ocId: oc.id } }); setMsg({ tipo: r.falhas || r.incertos ? "erro" : "ok", texto: `${r.aceitos} aceito(s) pelo provedor, ${r.falhas} falha(s), ${r.incertos} incerto(s).` }); } catch (e) { setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha" }); } await loadDocs(); }}><Send className="h-3 w-3" /> Enviar agora</Button>}
            </div>
            {envios.map((e) => <div key={e.id} className="text-xs border-t border-border py-1">v{e.doc_version} · {e.email} ({e.papeis.join(", ")}) · <b className={e.status === "aceito" ? "text-success" : e.status === "pendente" ? "" : "text-warning"}>{e.status === "aceito" ? "aceito pelo provedor (entrega final não confirmada)" : e.status}</b> · tentativas {e.attempts}{e.last_error ? <div className="text-danger">{e.last_error}</div> : null}</div>)}
            {!envios.length && <div className="text-xs text-muted-foreground">Nenhum envio registrado.</div>}
            <p className="text-[11px] text-muted-foreground mt-1">O envio automático com o app fechado depende da ativação do agendador no servidor (desativado durante a validação).</p>
          </div>
        </div>
      </>}
      <div>
        <div className="text-xs font-semibold mb-1">Histórico operacional</div>
        <Timeline entries={oc.historico ?? []} />
      </div>
    </div>
  );
}

function ConversaoLegado() {
  const ocs = useOrdensColeta(); const orders = useOrders(); const clients = useClients(); const { user } = useAuth();
  const [aberto, setAberto] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const preview = useMemo(() => previewConversao(ocs.list, orders.list, clients.list, user?.nome ?? "admin"), [ocs.list, orders.list, clients.list, user?.nome]);
  const conv = preview.filter((p) => p.proposta);
  async function confirmar() {
    if (!confirm(`Converter ${conv.length} OC(s) legadas? Números, NFs e histórico são preservados; nenhuma é emitida e nenhum e-mail é enviado.`)) return;
    setBusy(true);
    try {
      const byId = new Map(conv.map((p) => [p.oc.id, p.proposta!]));
      await commitLists({ ordensColeta: (getList<OrdemColeta>("ordensColeta") ?? []).map((o) => byId.get(o.id) ?? o) }, `Conversão confirmada de ${conv.length} OC legadas`);
      setMsg(`${conv.length} OC(s) convertidas.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Falha na conversão; nada foi alterado."); }
    finally { setBusy(false); }
  }
  return (
    <div className="panel p-4 border-warning/40 space-y-2">
      <div className="flex items-center gap-2"><b className="text-warning">{preview.length} OC(s) legadas</b><span className="text-xs text-muted-foreground">criadas automaticamente pelo modelo antigo. Não aparecem no Monitoramento até a conversão confirmada.</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar prévia" : "Ver prévia de conversão"}</Button></div>
      {aberto && <>
        <div className="max-h-72 overflow-auto text-xs">
          <table className="w-full"><thead className="text-muted-foreground text-left"><tr><th>OC</th><th>Status atual</th><th>Após conversão</th><th>NFs</th><th>Avisos</th></tr></thead>
            <tbody>{preview.map((p) => <tr key={p.oc.id} className="border-t border-border"><td className="py-1 num">{p.oc.numero}</td><td>{p.oc.status}</td><td>{p.proposta ? `${p.proposta.status}${p.proposta.documentoEstado === "legado_sem_snapshot" ? " · legado sem PDF" : ""}` : <span className="text-danger">não convertida</span>}</td><td>{p.oc.orderIds.length}</td><td>{p.avisos.join(" · ")}</td></tr>)}</tbody></table>
        </div>
        {user?.role === "admin" ? <Button disabled={busy || !conv.length} onClick={confirmar}>{busy ? "Convertendo…" : `Confirmar conversão de ${conv.length}`}</Button> : <p className="text-xs text-muted-foreground">Somente administradores confirmam a conversão.</p>}
        {msg && <div role="status" className="text-xs">{msg}</div>}
      </>}
    </div>
  );
}
