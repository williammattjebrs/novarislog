// Follow-up das OCs emitidas até a coleta e o CT-e: previsão, status e observações na mesma OC.
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useEmpresas, useMotoristas, useOrders, useOrdensColeta, useVeiculos } from "@/lib/mock-store";
import { OC_STATUS, type OCStatus, type OrdemColeta } from "@/lib/mock-data";
import { isEmitida, OC_EXECUCAO } from "@/lib/oc-model";
import { aplicarStatusOc, salvarOc } from "@/lib/oc-actions";
import { useEmpresaFiltro, filtrarOcs } from "@/lib/empresa-filter";
import { useAuth } from "@/lib/auth";
import { fmtDataHora } from "@/lib/oc-pdf";

const inp = "bg-input/40 border border-border rounded px-2 py-1 text-xs";
const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function AcompanhamentoColeta() {
  const ocs = useOrdensColeta(); const orders = useOrders(); const mot = useMotoristas(); const vei = useVeiculos(); const empresas = useEmpresas();
  const [empresaF] = useEmpresaFiltro();
  const [filtro, setFiltro] = useState<"pendentes" | "atrasadas" | "coletadas" | "todas">("pendentes");
  const [busca, setBusca] = useState("");
  const semCte = (oc: OrdemColeta) => oc.orderIds.some((id) => { const n = orders.list.find((x) => x.id === id); return n && !n.cteChave && !n.cteNumero; });
  const base = filtrarOcs(empresaF, ocs.list).filter((o) => isEmitida(o) && (["emitida", "em_coleta", "ocorrencia"].includes(o.status) || (o.status === "coletada" && semCte(o))));
  const atrasada = (o: OrdemColeta) => o.status !== "coletada" && Date.parse(o.previsaoColeta || o.dataHoraColeta) < Date.now();
  const q = busca.trim().toLowerCase();
  const lista = base.filter((o) => (filtro === "todas" || (filtro === "pendentes" && o.status !== "coletada") || (filtro === "coletadas" && o.status === "coletada") || (filtro === "atrasadas" && atrasada(o)))
    && (!q || [o.numero, o.clienteColetaNome, o.localColeta, mot.list.find((m) => m.id === o.motoristaId)?.nome, vei.list.find((v) => v.id === o.veiculoId)?.placa].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => (a.previsaoColeta || a.dataHoraColeta).localeCompare(b.previsaoColeta || b.dataHoraColeta));
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display">OCs emitidas · follow-up da coleta</h2>
        <span className="text-xs text-muted-foreground">{base.filter((o) => o.status !== "coletada").length} a coletar · {base.filter(atrasada).length} atrasada(s)</span>
        <select aria-label="Filtro do acompanhamento" className={inp + " ml-auto"} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="pendentes">A coletar</option><option value="atrasadas">Atrasadas</option><option value="coletadas">Coletadas sem CT-e</option><option value="todas">Todas</option>
        </select>
        <input aria-label="Buscar no acompanhamento" className={inp} placeholder="OC, cliente, motorista, placa" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground text-left"><tr className="border-b border-border"><th className="p-2">OC</th><th>Empresa</th><th>Cliente / coleta</th><th>Motorista · placa</th><th>Coleta programada</th><th>Previsão atual</th><th>Status</th><th>Observação</th></tr></thead>
          <tbody>{lista.map((o) => <Linha key={o.id} oc={o} empresa={empresas.list.find((e) => e.id === o.empresaId)?.nome ?? "—"} motorista={mot.list.find((m) => m.id === o.motoristaId)?.nome ?? "—"} placa={vei.list.find((v) => v.id === o.veiculoId)?.placa ?? ""} atrasada={atrasada(o)} />)}
            {!lista.length && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhuma OC emitida neste filtro. Emita em <Link to="/ordens-coleta" className="text-primary">Ordens de coleta</Link>.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Linha({ oc, empresa, motorista, placa, atrasada }: { oc: OrdemColeta; empresa: string; motorista: string; placa: string; atrasada: boolean }) {
  const { user } = useAuth(); const autor = user?.nome ?? "usuário";
  const [obs, setObs] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Falha"); } finally { setBusy(false); } };
  const ult = (oc.historico ?? []).at(-1);
  return (
    <tr className={`border-b border-border align-top ${atrasada ? "bg-danger/5" : ""}`}>
      <td className="p-2"><Link to="/ordens-coleta" search={{ registro: oc.id }} className="num text-primary">{oc.numero}</Link><div className="text-muted-foreground">{oc.orderIds.length} NF</div></td>
      <td>{empresa}</td>
      <td>{oc.clienteColetaNome ?? oc.clienteNome}<div className="text-muted-foreground">{oc.localColeta || "—"} · {oc.cidadeColeta}/{oc.ufColeta}</div></td>
      <td>{motorista}<div className="num text-muted-foreground">{placa}</div></td>
      <td>{fmtDataHora(oc.dataHoraColeta)}</td>
      <td><input aria-label={`Previsão de coleta ${oc.numero}`} type="datetime-local" disabled={busy} className={inp + (atrasada ? " border-danger" : "")} defaultValue={toLocal(oc.previsaoColeta || oc.dataHoraColeta)}
        onBlur={(e) => { const v = e.target.value ? new Date(e.target.value).toISOString() : ""; if (v && v !== (oc.previsaoColeta || oc.dataHoraColeta)) void run(() => salvarOc(oc, { previsaoColeta: v }, autor, `Previsão de coleta: ${fmtDataHora(v)}`)); }} /></td>
      <td><select aria-label={`Status ${oc.numero}`} disabled={busy} className={inp} value={oc.status} onChange={(e) => { const novo = e.target.value as OCStatus; const label = OC_STATUS.find((s) => s.id === novo)?.label ?? novo; void run(() => aplicarStatusOc(oc, novo, label, autor)); }}>
        {OC_EXECUCAO.map((s) => <option key={s.id} value={s.id}>{OC_STATUS.find((x) => x.id === s.id)?.label ?? s.label}</option>)}
      </select></td>
      <td className="min-w-56"><div className="flex gap-1"><input aria-label={`Observação ${oc.numero}`} className={inp + " flex-1"} placeholder="Follow-up…" value={obs} onChange={(e) => setObs(e.target.value)} />
        <button disabled={busy || !obs.trim()} className="px-2 rounded border border-primary/40 text-primary disabled:opacity-40" onClick={() => void run(async () => { await salvarOc(oc, {}, autor, obs.trim()); setObs(""); })}>ok</button></div>
        {ult && <div className="text-muted-foreground mt-1 truncate max-w-64" title={ult.texto}>{ult.texto}</div>}
        {err && <div className="text-danger">{err}</div>}</td>
    </tr>
  );
}
