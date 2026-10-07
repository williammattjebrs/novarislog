// Fluxo automático: NF-e importada → rota (mesmo remetente + destinatário) → ordem de coleta aguardando programação.
// Enquanto a OC não sai para coleta, novas NFs do mesmo par entram na mesma rota e na mesma OC.
import { useEffect } from "react";
import { useOrders, useRotas, useOrdensColeta, newId } from "./mock-store";
import type { Order, OrdemColeta, Rota } from "./mock-data";

const norm = (s?: string) => (s ?? "").replace(/\D/g, "") || "";
export const rotaKey = (o: Pick<Order, "remetente" | "remetenteCnpj" | "destinatario" | "destinatarioCnpj">) =>
  `${norm(o.remetenteCnpj) || o.remetente.trim().toUpperCase()}|${norm(o.destinatarioCnpj) || o.destinatario.trim().toUpperCase()}`;

const OC_ABERTA = new Set(["aguardando_programacao", "emitida", "enviada_motorista"]);

export function useAutoRotas() {
  const orders = useOrders();
  const rotas = useRotas();
  const ocs = useOrdensColeta();
  useEffect(() => {
    const vinculadas = new Set(rotas.list.flatMap((r) => r.orderIds));
    const soltas = orders.list.filter((o) => !vinculadas.has(o.id) && o.stage !== "entregue");
    if (!soltas.length) return;
    const nextRotas: Rota[] = rotas.list.map((r) => ({ ...r }));
    const nextOcs: OrdemColeta[] = ocs.list.map((o) => ({ ...o }));
    const now = new Date().toISOString();
    let seq = nextOcs.length;
    for (const o of soltas) {
      const k = rotaKey(o);
      let rota = nextRotas.find((r) => r.status === "aberta" && rotaKey(r) === k);
      if (!rota) {
        rota = {
          id: newId("ROT"), clienteId: o.clienteId, clienteNome: o.clienteNome,
          remetente: o.remetente, remetenteCnpj: o.remetenteCnpj, cidadeColeta: o.cidadeColeta, ufColeta: o.ufColeta,
          destinatario: o.destinatario, destinatarioCnpj: o.destinatarioCnpj, cidadeEntrega: o.cidadeEntrega, ufEntrega: o.ufEntrega,
          orderIds: [], status: "aberta", criadoEm: now, atualizadoEm: now,
        };
        nextRotas.unshift(rota);
      }
      rota.orderIds = [...rota.orderIds, o.id]; rota.atualizadoEm = now;
      const rotaId = rota.id;
      let oc = nextOcs.find((x) => x.rotaId === rotaId && OC_ABERTA.has(x.status));
      if (!oc) {
        seq++;
        oc = {
          id: newId("OC"), numero: `OC-${String(seq).padStart(5, "0")}`, rotaId, clienteNome: rota.clienteNome, orderIds: [],
          motoristaId: rota.motoristaId, veiculoId: rota.veiculoId,
          localColeta: rota.remetente, cidadeColeta: rota.cidadeColeta, ufColeta: rota.ufColeta, dataHoraColeta: "",
          localEntrega: rota.destinatario, cidadeEntrega: rota.cidadeEntrega, ufEntrega: rota.ufEntrega, dataHoraEntrega: "",
          status: "aguardando_programacao", criadoPor: "sistema", criadoEm: now, atualizadoEm: now,
        };
        nextOcs.unshift(oc);
      }
      oc.orderIds = [...oc.orderIds, o.id]; oc.atualizadoEm = now;
    }
    rotas.set(nextRotas);
    ocs.set(nextOcs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.list.length, rotas.list.map((r) => r.orderIds.length + r.status).join()]);
}
