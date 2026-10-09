// Ações operacionais da OC no navegador: gravação confirmada, OC e NFs no mesmo lote.
import { commitLists, getList } from "./shared-db";
import { stageFromOc } from "./oc-model";
import type { OCStatus, OrdemColeta, Order, TimelineEntry } from "./mock-data";

export async function aplicarStatusOc(oc: OrdemColeta, status: OCStatus, texto: string, autor: string, tipo: TimelineEntry["tipo"] = "status") {
  const now = new Date().toISOString();
  const entry: TimelineEntry = { quando: now, autor, tipo, texto };
  const ocs = (getList<OrdemColeta>("ordensColeta") ?? []).map((o) => (o.id === oc.id ? { ...o, status, historico: [...(o.historico ?? []), entry], atualizadoEm: now } : o));
  const orders = (getList<Order>("orders") ?? []).map((n) => {
    if (!oc.orderIds.includes(n.id)) return n;
    const stage = status === oc.status ? n.stage : stageFromOc(status, n);
    return { ...n, stage, ocId: status === "cancelada" ? undefined : n.ocId, coletadoEm: status === "coletada" && oc.status !== "coletada" ? now : n.coletadoEm, entregueEm: status === "entregue" ? now : n.entregueEm, atualizadoEm: now, timeline: [...n.timeline, { ...entry, texto: `${oc.numero}: ${texto}` }] };
  });
  await commitLists({ ordensColeta: ocs, orders }, `${oc.numero}: ${texto}`.slice(0, 200));
}

export async function salvarOc(oc: OrdemColeta, patch: Partial<OrdemColeta>, autor: string, texto: string) {
  const now = new Date().toISOString();
  const ocs = (getList<OrdemColeta>("ordensColeta") ?? []).map((o) => (o.id === oc.id ? { ...o, ...patch, historico: [...(o.historico ?? []), { quando: now, autor, tipo: "sistema" as const, texto }], atualizadoEm: now } : o));
  await commitLists({ ordensColeta: ocs }, `${oc.numero}: ${texto}`.slice(0, 200));
}
