// Monitoramento: acompanha exclusivamente OCs emitidas (mesma entidade de Ordens de coleta).
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useEffect, useMemo, useState } from "react";
import { Filter, X, Search, Mail } from "lucide-react";
import { BulkClientUpdate } from "@/components/BulkClientUpdate";
import { useOrders, useConfig, useOrdensColeta, useMotoristas, useVeiculos } from "@/lib/mock-store";
import { stageLabel, statusTone, toneClass, OC_STATUS, type OCStatus } from "@/lib/mock-data";
import { Timeline } from "@/components/Timeline";
import { CostPanel } from "@/components/CostPanel";
import { TrackingPanel } from "@/components/TrackingPanel";
import { useAuth } from "@/lib/auth";
import { financialAccess } from "@/lib/permissions";
import { isEmitida, isV2, OC_EXECUCAO } from "@/lib/oc-model";
import { aplicarStatusOc } from "@/lib/oc-actions";
import { fmtDataHora } from "@/lib/oc-pdf";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/monitoramento")({
  validateSearch: (search: Record<string, unknown>): { registro?: string } => ({ registro: typeof search.registro === "string" ? search.registro : undefined }),
  head: () => ({
    meta: [
      { title: "Monitoramento | Novaris" },
      { name: "description", content: "Acompanhamento das ordens de coleta emitidas: coleta, viagem, entrega e ocorrências." },
      { property: "og:title", content: "Monitoramento | Novaris" },
      { property: "og:description", content: "Acompanhamento das ordens de coleta emitidas: coleta, viagem, entrega e ocorrências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<RoleGate path="/monitoramento"><MonitoramentoPage /></RoleGate>),
});

function MonitoramentoPage() {
  const orders = useOrders(); const ocs = useOrdensColeta(); const mot = useMotoristas(); const vei = useVeiculos();
  const [cfg] = useConfig(); const { user } = useAuth(); const canSeeCosts = financialAccess(user);
  const [busca, setBusca] = useState(""); const [st, setSt] = useState<OCStatus | "">("");
  const { registro } = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(registro ?? null);
  useEffect(() => { if (registro) setSelected(registro); }, [registro]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const emitidas = ocs.list.filter(isEmitida);
  const q = busca.trim().toLowerCase();
  const nfById = useMemo(() => new Map(orders.list.map((o) => [o.id, o])), [orders.list]);
  const filtered = emitidas.filter((oc) => (!st || oc.status === st) && (!q || [oc.numero, oc.clienteColetaNome, oc.clienteDescargaNome, oc.localColeta, oc.localEntrega, mot.list.find((m) => m.id === oc.motoristaId)?.nome, vei.list.find((v) => v.id === oc.veiculoId)?.placa, ...oc.orderIds.map((id) => nfById.get(id)?.numeroNFe)].join(" ").toLowerCase().includes(q)));
  const legados = ocs.list.filter((o) => !isV2(o) && o.status !== "cancelada").length;
  const sel = selected ? emitidas.find((o) => o.id === selected || o.orderIds.includes(selected)) : undefined;
  const nfsMonitoradas = orders.list.filter((n) => emitidas.some((oc) => oc.orderIds.includes(n.id)));

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execução</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Monitoramento de OCs</h1>
          <p className="text-sm text-muted-foreground mt-1">{emitidas.length} OC emitidas · {nfsMonitoradas.length} NF nessas OCs. Rascunhos não aparecem aqui.</p>
        </div>
        {legados > 0 && <div className="panel p-3 text-xs text-warning">{legados} OC(s) legadas aguardam conversão em <Link to="/ordens-coleta" className="underline">Ordens de coleta</Link> e não são monitoradas.</div>}
        <div className="panel p-3 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value as OCStatus | "")} className="input max-w-[200px]">
            <option value="">Todos os status</option>{OC_EXECUCAO.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar OC, motorista, placa, cliente, local, NF" className="input pl-7" />
          </div>
          <button onClick={() => setBulkOpen(true)} className="ml-auto text-xs px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Atualizar cliente (por NF)</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`panel overflow-x-auto ${sel ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-normal px-4 py-2.5">OC</th><th className="text-left font-normal">Motorista / placa</th><th className="text-left font-normal">Cliente coleta → descarga</th><th className="text-left font-normal">Locais</th><th className="text-left font-normal">Coleta / previsão</th><th className="text-left font-normal">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((oc) => {
                  const m = mot.list.find((x) => x.id === oc.motoristaId); const v = vei.list.find((x) => x.id === oc.veiculoId);
                  return (
                    <tr key={oc.id} onClick={() => setSelected(oc.id)} className={`border-t border-border hover:bg-elevated/50 cursor-pointer ${sel?.id === oc.id ? "bg-elevated/60" : ""}`}>
                      <td className="px-4 py-3 num text-primary text-xs">{oc.numero}<div className="text-[10px] text-muted-foreground">{oc.orderIds.length} NF</div></td>
                      <td className="text-xs">{m?.nome ?? "—"}<div className="num">{v?.placa ?? "—"}</div></td>
                      <td className="text-xs">{oc.clienteColetaNome} → {oc.clienteDescargaNome}</td>
                      <td className="text-xs">{oc.localColeta} ({oc.cidadeColeta}/{oc.ufColeta}) → {oc.localEntrega} ({oc.cidadeEntrega}/{oc.ufEntrega})</td>
                      <td className="text-xs">{fmtDataHora(oc.dataHoraColeta)}<div className="text-muted-foreground">{fmtDataHora(oc.dataHoraEntrega)}</div></td>
                      <td className="text-xs">{OC_STATUS.find((s) => s.id === oc.status)?.label}</td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Nenhuma OC emitida com esses filtros.</td></tr>}
              </tbody>
            </table>
          </div>
          {sel && <OcPainel key={sel.id} ocId={sel.id} onClose={() => setSelected(null)} canSeeCosts={canSeeCosts} />}
        </div>
      </div>
      {bulkOpen && (
        <BulkClientUpdate orders={nfsMonitoradas} autor={user?.nome ?? "sistema"} onClose={() => setBulkOpen(false)}
          onSent={(ids, entry, email) => { const now = new Date().toISOString(); orders.set(orders.list.map((o) => ids.includes(o.id) ? { ...o, emailCliente: o.emailCliente || email, timeline: [...o.timeline, entry], atualizadoEm: now } : o)); }} />
      )}
    </AppShell>
  );
}

function OcPainel({ ocId, onClose, canSeeCosts }: { ocId: string; onClose: () => void; canSeeCosts: boolean }) {
  const ocs = useOrdensColeta(); const orders = useOrders(); const [cfg] = useConfig(); const { user } = useAuth();
  const oc = ocs.list.find((o) => o.id === ocId)!;
  const [status, setStatus] = useState<OCStatus>(oc.status); const [texto, setTexto] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [nfSel, setNfSel] = useState<string | null>(null);
  const nfs = oc.orderIds.map((id) => orders.list.find((n) => n.id === id)).filter(Boolean) as typeof orders.list;
  const nf = nfs.find((n) => n.id === nfSel);
  async function registrar(tipo: "status" | "ocorrencia" | "obs") {
    if (tipo !== "status" && !texto.trim()) return setErr("Descreva o apontamento.");
    setBusy(true); setErr("");
    try {
      const novo = tipo === "ocorrencia" ? "ocorrencia" : tipo === "status" ? status : oc.status;
      const label = OC_STATUS.find((s) => s.id === novo)?.label ?? novo;
      await aplicarStatusOc(oc, novo, tipo === "obs" ? texto.trim() : `${label}${texto.trim() ? ` · ${texto.trim()}` : ""}`, user?.nome ?? "usuário", tipo === "ocorrencia" ? "ocorrencia" : tipo === "obs" ? "observacao" : "status");
      setTexto("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Falha ao gravar."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ordem de coleta</div><div className="font-display num text-primary">{oc.numero}</div></div>
          <button aria-label="Fechar" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
        <div className="text-xs">{oc.clienteColetaNome} · {oc.localColeta} → {oc.clienteDescargaNome} · {oc.localEntrega}</div>
        <div className="flex gap-2">
          <select aria-label="Novo status" className="input" value={status} onChange={(e) => setStatus(e.target.value as OCStatus)}>{OC_EXECUCAO.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <Button size="sm" disabled={busy || status === oc.status} onClick={() => registrar("status")}>Registrar</Button>
        </div>
        <textarea aria-label="Apontamento" className="input min-h-[60px]" placeholder="Observação, previsão ou descrição de ocorrência" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => registrar("obs")}>Adicionar observação</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => registrar("ocorrencia")}>Registrar ocorrência</Button></div>
        {err && <div className="text-xs text-danger" role="alert">{err}</div>}
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">NFs (andamento compartilhado; CT-e/financeiro separado)</div>
        {nfs.map((n) => <button key={n.id} onClick={() => setNfSel(n.id === nfSel ? null : n.id)} className="w-full text-left text-xs flex justify-between border-t border-border py-1"><span>NF {n.numeroNFe} · {n.destinatario}</span><span className={`px-1.5 rounded border ${toneClass(statusTone(n.stage))}`}>{stageLabel(n.stage)}</span></button>)}
        <Link to="/ordens-coleta" search={{ registro: oc.id }} className="text-xs text-primary">documentos e envios →</Link>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Histórico da OC</div>
        <Timeline entries={oc.historico ?? []} />
      </div>
      {nf && <TrackingPanel key={nf.id} order={nf} cfg={cfg} autor={user?.nome ?? "sistema"} onUpdate={(patch) => orders.update(nf.id, patch)} />}
      {nf && canSeeCosts && <CostPanel costs={nf.costs} valorFrete={nf.valorFrete} onSave={(next) => orders.update(nf.id, { costs: next, atualizadoEm: new Date().toISOString() })} />}
    </div>
  );
}
