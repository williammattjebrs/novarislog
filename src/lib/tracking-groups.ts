import type { Order } from "@/lib/mock-data";
import { getList, setList } from "@/lib/shared-db";
import { enrichTrackingOrders } from "@/lib/tracking-email";
import type { OrdemColeta } from "@/lib/mock-data";

export type TrackingTrigger = "interval" | "onUpdate";
export type TrackingGroup = { emails: string[]; automatic: boolean; intervalMin: number; lastSent?: string; trigger?: TrackingTrigger };
const EMPTY: TrackingGroup = { emails: [], automatic: false, intervalMin: 60, trigger: "interval" };
export function readTrackingGroup(client: string): TrackingGroup {
  const g = (getList<any>("trackingGroups") ?? []).find((x) => x.id === client);
  if (g) { const { id: _id, ...rest } = g; return rest as TrackingGroup; }
  return EMPTY;
}
export function saveTrackingGroup(client: string, group: TrackingGroup) {
  const list = (getList<any>("trackingGroups") ?? []).filter((x) => x.id !== client);
  return setList("trackingGroups", [{ ...group, id: client }, ...list]);
}
type TrackingSendFn = (args: { data: { cliente: string; empresaId?: string; destinatarios: string[]; ordens: ReturnType<typeof trackingPayload> } }) => Promise<unknown>;

// Envia atualização imediata aos clientes cujo grupo está em "a cada atualização".
export async function sendTrackingOnUpdate(orders: Order[], send: TrackingSendFn): Promise<string[]> {
  const ocs = getList<OrdemColeta>("ordensColeta") ?? [];
  const byClient = new Map<string, { group: TrackingGroup; orders: Order[] }>();
  for (const o of orders) {
    const group = readTrackingGroup(o.clienteNome);
    if (!group.automatic || (group.trigger ?? "interval") !== "onUpdate" || !group.emails.length) continue;
    const entry = byClient.get(o.clienteNome) ?? { group, orders: [] };
    entry.orders.push(o); byClient.set(o.clienteNome, entry);
  }
  const sent: string[] = [];
  for (const [cliente, { group, orders: list }] of byClient) {
    const empresaId = ocs.find((oc) => oc.status !== "cancelada" && list.some((o) => oc.orderIds.includes(o.id)))?.empresaId;
    await send({ data: { cliente, empresaId, destinatarios: group.emails, ordens: trackingPayload(list) } });
    await saveTrackingGroup(cliente, { ...group, lastSent: new Date().toISOString() });
    sent.push(cliente);
  }
  return sent;
}
export function trackingPayload(orders: Order[]) {
  return enrichTrackingOrders(orders, getList<OrdemColeta>("ordensColeta") ?? []).map((o) => ({ numeroNFe: String(o.numeroNFe), destinatario: o.destinatario ?? "", cidadeColeta: o.cidadeColeta, ufColeta: o.ufColeta, cidadeEntrega: o.cidadeEntrega, ufEntrega: o.ufEntrega, previsaoEntrega: o.previsaoEntrega || undefined, coletadoEm: o.coletadoEm, ultimaObservacao: o.ultimaObservacao, statusOperacional: o.statusOperacional, peso: o.peso, stage: o.stage, rastreio: o.rastreio ? { situacao: o.rastreio.situacao } : undefined }));
}
