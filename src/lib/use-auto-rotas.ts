// Agrupa automaticamente as NF-e em rotas: mesmo remetente + mesmo destinatário = 1 rota aberta com N notas.
import { useEffect } from "react";
import { useOrders, useRotas, newId } from "./mock-store";
import type { Order, Rota } from "./mock-data";

const norm = (s?: string) => (s ?? "").replace(/\D/g, "") || "";
export const rotaKey = (o: Pick<Order, "remetente" | "remetenteCnpj" | "destinatario" | "destinatarioCnpj">) =>
  `${norm(o.remetenteCnpj) || o.remetente.trim().toUpperCase()}|${norm(o.destinatarioCnpj) || o.destinatario.trim().toUpperCase()}`;

export function useAutoRotas() {
  const orders = useOrders();
  const rotas = useRotas();
  useEffect(() => {
    const vinculadas = new Set(rotas.list.flatMap((r) => r.orderIds));
    const soltas = orders.list.filter((o) => !vinculadas.has(o.id) && !["entregue"].includes(o.stage));
    if (!soltas.length) return;
    const next: Rota[] = [...rotas.list];
    const now = new Date().toISOString();
    for (const o of soltas) {
      const k = rotaKey(o);
      const aberta = next.find((r) => r.status === "aberta" && rotaKey(r) === k);
      if (aberta) { aberta.orderIds = [...aberta.orderIds, o.id]; aberta.atualizadoEm = now; continue; }
      next.unshift({
        id: newId("ROT"), clienteId: o.clienteId, clienteNome: o.clienteNome,
        remetente: o.remetente, remetenteCnpj: o.remetenteCnpj, cidadeColeta: o.cidadeColeta, ufColeta: o.ufColeta,
        destinatario: o.destinatario, destinatarioCnpj: o.destinatarioCnpj, cidadeEntrega: o.cidadeEntrega, ufEntrega: o.ufEntrega,
        orderIds: [o.id], status: "aberta", criadoEm: now, atualizadoEm: now,
      });
    }
    rotas.set(next.map((r) => ({ ...r })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.list.length, rotas.list.length]);
}
