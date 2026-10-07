// Rotas (agrupamento de NFs por remetente+destinatário) e Ordens de Coleta (documento enviado ao motorista).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Download, MessageCircle, Route as RouteIcon, ClipboardList, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { useOrders, useRotas, useOrdensColeta, useMotoristas, useVeiculos, newId } from "@/lib/mock-store";
import { OC_STATUS, type OrdemColeta, type Rota, type OCStatus } from "@/lib/mock-data";
import { useAutoRotas } from "@/lib/use-auto-rotas";
import { useAuth } from "@/lib/auth";
import { abrirEspelho, baixarEspelho, whatsappMotorista, fmtDH } from "@/lib/espelho-coleta";

export const Route = createFileRoute("/rotas")({
  head: () => ({ meta: [
    { title: "Rotas & Ordens de Coleta | Novaris TMS" },
    { name: "description", content: "Rotas geradas a partir das NF-e, vínculo de motorista e veículo e emissão de ordens de coleta com espelho." },
    { property: "og:title", content: "Rotas & Ordens de Coleta | Novaris TMS" },
    { property: "og:description", content: "Agrupe NF-e em rotas, vincule motorista e veículo e emita a ordem de coleta." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/rotas"><AppShell><Page /></AppShell></RoleGate>,
});

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const ROTA_LABEL = { aberta: "Aberta", programada: "OC emitida", encerrada: "Encerrada" } as const;

function Page() {
  useAutoRotas();
  const [tab, setTab] = useState<"r" | "oc">("r");
  const [ocRota, setOcRota] = useState<Rota | null>(null);
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display">Rotas & Ordens de Coleta</h1>
        <p className="text-sm text-muted-foreground">NF-e com o mesmo remetente e destinatário formam uma rota. Vincule motorista e veículo e gere a ordem de coleta.</p>
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "r" ? "default" : "outline"} onClick={() => setTab("r")}><RouteIcon className="h-4 w-4" /> Rotas</Button>
        <Button variant={tab === "oc" ? "default" : "outline"} onClick={() => setTab("oc")}><ClipboardList className="h-4 w-4" /> Ordens de coleta</Button>
      </div>
      {tab === "r" ? <Rotas onGerar={setOcRota} /> : <Ordens />}
      {ocRota && <NovaOC rota={ocRota} onClose={() => setOcRota(null)} onDone={() => { setOcRota(null); setTab("oc"); }} />}
    </div>
  );
}

function Rotas({ onGerar }: { onGerar: (r: Rota) => void }) {
  const rotas = useRotas(); const orders = useOrders(); const mot = useMotoristas(); const vei = useVeiculos();
  const [filtro, setFiltro] = useState<"aberta" | "todas">("aberta");
  const lista = rotas.list.filter((r) => filtro === "todas" || r.status === "aberta");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <select className="bg-input/40 border border-border rounded px-2 py-1" value={filtro} onChange={(e) => setFiltro(e.target.value as "aberta" | "todas")}>
          <option value="aberta">Rotas abertas</option><option value="todas">Todas</option>
        </select>
        {(!mot.list.length || !vei.list.length) && <Link to="/motoristas" className="text-xs text-warning hover:underline">Cadastre motoristas e veículos para agilizar →</Link>}
      </div>
      {lista.map((r) => {
        const nfs = orders.list.filter((o) => r.orderIds.includes(o.id));
        return (
          <div key={r.id} className="panel p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-xs text-muted-foreground">{r.id}</span>
              <span className="font-display">{r.cidadeColeta}/{r.ufColeta} → {r.cidadeEntrega}/{r.ufEntrega}</span>
              <span className="text-xs px-2 py-0.5 rounded border border-primary/40 text-primary">{ROTA_LABEL[r.status]}</span>
              <span className="ml-auto text-xs text-muted-foreground">{nfs.length} NF · {nfs.reduce((s, n) => s + (n.peso || 0), 0).toLocaleString("pt-BR")} kg</span>
            </div>
            <div className="text-xs text-muted-foreground">Remetente: <b className="text-foreground">{r.remetente}</b> · Destinatário: <b className="text-foreground">{r.destinatario}</b></div>
            <div className="text-xs">NFs: {nfs.map((n) => n.numeroNFe).join(", ") || "—"}</div>
            <div className="grid md:grid-cols-3 gap-2 items-center">
              <select className={inp} value={r.motoristaId ?? ""} onChange={(e) => rotas.update(r.id, { motoristaId: e.target.value || undefined })}>
                <option value="">Motorista…</option>{mot.list.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.cpf} · {m.telefone}</option>)}
              </select>
              <select className={inp} value={r.veiculoId ?? ""} onChange={(e) => rotas.update(r.id, { veiculoId: e.target.value || undefined })}>
                <option value="">Veículo (placa)…</option>{vei.list.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.tipo}</option>)}
              </select>
              <Button disabled={!r.motoristaId || !r.veiculoId || !nfs.length || r.status !== "aberta"} onClick={() => onGerar(r)}>Gerar ordem de coleta</Button>
            </div>
          </div>
        );
      })}
      {!lista.length && <div className="panel p-6 text-center text-sm text-muted-foreground">Nenhuma rota. As rotas são criadas automaticamente quando chega uma NF-e (e-mail ou importação em Coletas).</div>}
    </div>
  );
}

function NovaOC({ rota, onClose, onDone }: { rota: Rota; onClose: () => void; onDone: () => void }) {
  const orders = useOrders(); const ocs = useOrdensColeta(); const rotas = useRotas(); const mot = useMotoristas(); const vei = useVeiculos();
  const { user } = useAuth();
  const nfs = orders.list.filter((o) => rota.orderIds.includes(o.id));
  const [sel, setSel] = useState<string[]>(nfs.map((n) => n.id));
  const [f, setF] = useState({
    localColeta: rota.remetente, cidadeColeta: rota.cidadeColeta, ufColeta: rota.ufColeta, dataHoraColeta: "",
    localEntrega: rota.destinatario, cidadeEntrega: rota.cidadeEntrega, ufEntrega: rota.ufEntrega, dataHoraEntrega: "", observacao: "",
  });
  const [err, setErr] = useState("");
  function emitir() {
    if (!sel.length || !f.localColeta.trim() || !f.localEntrega.trim() || !f.dataHoraColeta) return setErr("Selecione as NFs e informe locais e data/hora da coleta.");
    const now = new Date().toISOString();
    const oc: OrdemColeta = {
      id: newId("OC"), numero: `OC-${String(ocs.list.length + 1).padStart(5, "0")}`, rotaId: rota.id, clienteNome: rota.clienteNome,
      orderIds: sel, motoristaId: rota.motoristaId!, veiculoId: rota.veiculoId!, ...f,
      dataHoraColeta: new Date(f.dataHoraColeta).toISOString(), dataHoraEntrega: f.dataHoraEntrega ? new Date(f.dataHoraEntrega).toISOString() : "",
      status: "emitida", criadoPor: user?.email ?? "", criadoEm: now, atualizadoEm: now,
    };
    ocs.add(oc);
    const m = mot.list.find((x) => x.id === oc.motoristaId); const v = vei.list.find((x) => x.id === oc.veiculoId);
    orders.set(orders.list.map((o) => sel.includes(o.id) ? {
      ...o, stage: "coleta_agendada", motorista: m ? `${m.nome} (${m.telefone})` : o.motorista, placa: v?.placa ?? o.placa,
      previsaoEntrega: oc.dataHoraEntrega || o.previsaoEntrega, atualizadoEm: now,
      timeline: [...o.timeline, { quando: now, autor: user?.email ?? "sistema", tipo: "status", texto: `Ordem de coleta ${oc.numero} emitida · coleta ${fmtDH(oc.dataHoraColeta)}` }],
    } : o));
    // NFs não selecionadas voltam a ficar livres para uma nova rota
    rotas.update(rota.id, { status: "programada", orderIds: sel, atualizadoEm: now });
    onDone();
  }
  return (
    <div className="fixed inset-0 z-50 bg-background/80 grid place-items-center p-4">
      <div className="panel p-5 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-3">
        <div className="flex items-center"><h2 className="font-display text-lg">Nova ordem de coleta</h2><button className="ml-auto" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="text-xs font-semibold">Notas que irão carregar</div>
        <div className="grid md:grid-cols-2 gap-1 text-sm">
          {nfs.map((n) => (
            <label key={n.id} className="flex gap-2 items-center"><input type="checkbox" checked={sel.includes(n.id)} onChange={(e) => setSel(e.target.checked ? [...sel, n.id] : sel.filter((x) => x !== n.id))} />
              NF {n.numeroNFe} · {(n.peso || 0).toLocaleString("pt-BR")} kg · {n.volumes} vol</label>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Coleta</legend>
            <input className={inp} placeholder="Local / endereço de coleta" value={f.localColeta} onChange={(e) => setF({ ...f, localColeta: e.target.value })} />
            <div className="flex gap-2"><input className={inp} value={f.cidadeColeta} onChange={(e) => setF({ ...f, cidadeColeta: e.target.value })} /><input className={inp + " w-16"} value={f.ufColeta} onChange={(e) => setF({ ...f, ufColeta: e.target.value.toUpperCase() })} /></div>
            <label className="text-xs">Data e hora da coleta<input type="datetime-local" className={inp} value={f.dataHoraColeta} onChange={(e) => setF({ ...f, dataHoraColeta: e.target.value })} /></label>
          </fieldset>
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Entrega</legend>
            <input className={inp} placeholder="Local / endereço de entrega" value={f.localEntrega} onChange={(e) => setF({ ...f, localEntrega: e.target.value })} />
            <div className="flex gap-2"><input className={inp} value={f.cidadeEntrega} onChange={(e) => setF({ ...f, cidadeEntrega: e.target.value })} /><input className={inp + " w-16"} value={f.ufEntrega} onChange={(e) => setF({ ...f, ufEntrega: e.target.value.toUpperCase() })} /></div>
            <label className="text-xs">Previsão de entrega<input type="datetime-local" className={inp} value={f.dataHoraEntrega} onChange={(e) => setF({ ...f, dataHoraEntrega: e.target.value })} /></label>
          </fieldset>
        </div>
        <textarea className={inp} rows={2} placeholder="Observações para o motorista" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} />
        {err && <div className="text-xs text-danger">{err}</div>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={emitir}>Emitir ordem de coleta</Button></div>
      </div>
    </div>
  );
}

function Ordens() {
  const ocs = useOrdensColeta(); const orders = useOrders(); const mot = useMotoristas(); const vei = useVeiculos(); const rotas = useRotas();
  const { user } = useAuth();
  const byId = useMemo(() => new Map(orders.list.map((o) => [o.id, o])), [orders.list]);
  function setStatus(oc: OrdemColeta, status: OCStatus) {
    const now = new Date().toISOString();
    ocs.update(oc.id, { status, atualizadoEm: now });
    const st = OC_STATUS.find((s) => s.id === status);
    if (st?.stage) orders.set(orders.list.map((o) => oc.orderIds.includes(o.id) ? { ...o, stage: st.stage!, atualizadoEm: now,
      timeline: [...o.timeline, { quando: now, autor: user?.email ?? "sistema", tipo: "status", texto: `${oc.numero}: ${st.label}` }] } : o));
    if (status === "entregue" || status === "cancelada") rotas.update(oc.rotaId, { status: status === "entregue" ? "encerrada" : "aberta" });
  }
  return (
    <div className="panel overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border"><th className="p-2">OC</th><th>Cliente</th><th>Coleta</th><th>Entrega</th><th>Motorista / Placa</th><th>NFs</th><th>Status</th><th className="text-right p-2">Espelho</th></tr></thead>
        <tbody>
          {ocs.list.map((oc) => {
            const m = mot.list.find((x) => x.id === oc.motoristaId); const v = vei.list.find((x) => x.id === oc.veiculoId);
            const nfs = oc.orderIds.map((id) => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
            return (
              <tr key={oc.id} className="border-b border-border align-top">
                <td className="p-2 num">{oc.numero}</td><td>{oc.clienteNome}</td>
                <td>{oc.cidadeColeta}/{oc.ufColeta}<div className="text-xs text-muted-foreground">{fmtDH(oc.dataHoraColeta)}</div></td>
                <td>{oc.cidadeEntrega}/{oc.ufEntrega}<div className="text-xs text-muted-foreground">{fmtDH(oc.dataHoraEntrega)}</div></td>
                <td>{m?.nome ?? "—"}<div className="text-xs num">{v?.placa ?? "—"}</div></td>
                <td className="text-xs">{nfs.map((n) => n.numeroNFe).join(", ")}</td>
                <td><select className="bg-input/40 border border-border rounded px-1 py-1 text-xs" value={oc.status} onChange={(e) => setStatus(oc, e.target.value as OCStatus)}>
                  {OC_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></td>
                <td className="p-2"><div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" title="Abrir / imprimir PDF" onClick={() => abrirEspelho(oc, nfs, m, v)}><FileText className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title="Baixar arquivo" onClick={() => baixarEspelho(oc, nfs, m, v)}><Download className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title="Enviar ao motorista (WhatsApp)" onClick={() => { whatsappMotorista(oc, nfs, m, v); if (oc.status === "emitida") setStatus(oc, "enviada_motorista"); }}><MessageCircle className="h-4 w-4" /></Button>
                </div></td>
              </tr>
            );
          })}
          {!ocs.list.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">Nenhuma ordem de coleta emitida.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
