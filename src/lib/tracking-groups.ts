import type { Order } from "@/lib/mock-data";

export type TrackingGroup = { emails: string[]; automatic: boolean; intervalMin: number; lastSent?: string };
export const groupKey = (client: string) => `novaris:tracking-group:${client}`;
export function readTrackingGroup(client: string): TrackingGroup {
  try { return JSON.parse(localStorage.getItem(groupKey(client)) ?? "null") ?? { emails: [], automatic: false, intervalMin: 60 }; }
  catch { return { emails: [], automatic: false, intervalMin: 60 }; }
}
export function saveTrackingGroup(client: string, group: TrackingGroup) {
  localStorage.setItem(groupKey(client), JSON.stringify(group));
}
export function trackingPayload(orders: Order[]) {
  return orders.map((o) => ({ numeroNFe: String(o.numeroNFe), destinatario: o.destinatario ?? "", cidadeColeta: o.cidadeColeta, ufColeta: o.ufColeta, cidadeEntrega: o.cidadeEntrega, ufEntrega: o.ufEntrega, previsaoEntrega: o.previsaoEntrega || undefined, stage: o.stage, rastreio: o.rastreio ? { situacao: o.rastreio.situacao } : undefined }));
}