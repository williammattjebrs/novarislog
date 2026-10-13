import { useState } from "react";
import type { OCStatus, OrdemColeta } from "@/lib/mock-data";
import { OC_STATUS } from "@/lib/mock-data";
import { isEmitida, OC_EXECUCAO } from "@/lib/oc-model";
import { aplicarStatusOc } from "@/lib/oc-actions";

export function MonitoringQuickStatus({ oc, autor }: { oc: OrdemColeta; autor: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function change(status: OCStatus) {
    if (busy || status === oc.status || !isEmitida(oc)) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const label = OC_STATUS.find((s) => s.id === status)?.label ?? status;
      await aplicarStatusOc(oc, status, label, autor);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o status.");
    } finally { setBusy(false); }
  }
  return <div className="min-w-48 max-w-64 space-y-1" onClick={(e) => e.stopPropagation()}>
    <select aria-label={`Status ${oc.numero}`} className="input text-xs" value={oc.status} disabled={busy || !isEmitida(oc)} aria-busy={busy} onChange={(e) => void change(e.target.value as OCStatus)}>
      {!isEmitida(oc) && <option value={oc.status}>{OC_STATUS.find((s) => s.id === oc.status)?.label ?? oc.status}</option>}
      {OC_EXECUCAO.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
    {busy && <p role="status" className="text-xs text-muted-foreground">Salvando…</p>}
    {!busy && saved && <p role="status" className="text-xs text-success">Status salvo.</p>}
    {error && <p role="alert" className="text-xs text-danger break-words">{error}</p>}
  </div>;
}