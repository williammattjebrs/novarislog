import type { Order } from "@/lib/mock-data";
import { getList, setList } from "@/lib/shared-db";
import { enrichTrackingOrders } from "@/lib/tracking-email";
import type { OrdemColeta } from "@/lib/mock-data";

export type TrackingGroup = { emails: string[]; automatic: boolean; intervalMin: number; lastSent?: string };
const EMPTY: TrackingGroup = { emails: [], automatic: false, intervalMin: 60 };
export function readTrackingGroup(client: string): TrackingGroup {
  const g = (getList<any>("trackingGroups") ?? []).find((x) => x.id === client);
  if (g) { const { id: _id, ...rest } = g; return rest as TrackingGroup; }
  return EMPTY;
}
export function saveTrackingGroup(client: string, group: TrackingGroup) {
  const list = (getList<any>("trackingGroups") ?? []).filter((x) => x.id !== client);
  return setList("trackingGroups", [{ ...group, id: client }, ...list]);
}
export function trackingPayload(orders: Order[]) {
  return enrichTrackingOrders(orders, getList<OrdemColeta>("ordensColeta") ?? []).map((o) => ({ numeroNFe: String(o.numeroNFe), destinatario: o.destinatario ?? "", cidadeColeta: o.cidadeColeta, ufColeta: o.ufColeta, cidadeEntrega: o.cidadeEntrega, ufEntrega: o.ufEntrega, previsaoEntrega: o.previsaoEntrega || undefined, coletadoEm: o.coletadoEm, ultimaObservacao: o.ultimaObservacao, statusOperacional: o.statusOperacional, peso: o.peso, stage: o.stage, rastreio: o.rastreio ? { situacao: o.rastreio.situacao } : undefined }));
}
