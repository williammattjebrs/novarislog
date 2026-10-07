// Fluxo automático: NF-e importada → rota (mesmo remetente + destinatário) → ordem de coleta aguardando programação.
// Enquanto a OC não sai para coleta, novas NFs do mesmo par entram na mesma rota e na mesma OC.
import { useEffect } from "react";
import { useOrders, useRotas, useOrdensColeta, newId } from "./mock-store";
import type { Order, OrdemColeta, Rota } from "./mock-data";

const norm = (s?: string) => (s ?? "").replace(/\D/g, "") || "";
export const rotaKey = (o: Pick<Order, "remetente" | "remetenteCnpj" | "destinatario" | "destinatarioCnpj">) =>
  `${norm(o.remetenteCnpj) || o.remetente.trim().toUpperCase()}|${norm(o.destinatarioCnpj) || o.destinatario.trim().toUpperCase()}`;

const OC_ABERTA = new Set(["aguardando_programacao", "emitida", "enviada_motorista"]);

// Vincula uma NF a uma rota aberta (mesmo remetente+destinatário) e a uma OC aberta dessa rota,
// criando rota e/ou OC quando não existirem. Retorna as listas atualizadas e a OC resultante.
export function vincularOrderEmRota(
  o: Order,
  rotasList: Rota[],
  ocsList: OrdemColeta[],
  criadoPor = "sistema",
): { rotas: Rota[]; ocs: OrdemColeta[]; oc: OrdemColeta } {
  const nextRotas = rotasList.map((r) => ({ ...r }));
  const nextOcs = ocsList.map((x) => ({ ...x }));
  const now = new Date().toISOString();
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
  if (!rota.orderIds.includes(o.id)) rota.orderIds = [...rota.orderIds, o.id];
  rota.atualizadoEm = now;
  const rotaId = rota.id;
  let oc = nextOcs.find((x) => x.rotaId === rotaId && OC_ABERTA.has(x.status));
  if (!oc) {
    const seq = nextOcs.length + 1;
    oc = {
      id: newId("OC"), numero: `OC-${String(seq).padStart(5, "0")}`, rotaId, clienteNome: rota.clienteNome, orderIds: [],
      motoristaId: rota.motoristaId, veiculoId: rota.veiculoId,
      localColeta: rota.remetente, cidadeColeta: rota.cidadeColeta, ufColeta: rota.ufColeta, dataHoraColeta: "",
      localEntrega: rota.destinatario, cidadeEntrega: rota.cidadeEntrega, ufEntrega: rota.ufEntrega, dataHoraEntrega: "",
      status: "aguardando_programacao", criadoPor, criadoEm: now, atualizadoEm: now,
    };
    nextOcs.unshift(oc);
  }
  if (!oc.orderIds.includes(o.id)) oc.orderIds = [...oc.orderIds, o.id];
  oc.atualizadoEm = now;
  return { rotas: nextRotas, ocs: nextOcs, oc };
}

export function useAutoRotas() {
  const orders = useOrders();
  const rotas = useRotas();
  const ocs = useOrdensColeta();
  const pendentes = (() => { const v = new Set(rotas.list.flatMap((r) => r.orderIds)); return orders.list.filter((o) => !v.has(o.id) && o.stage !== "entregue").length; })();
  useEffect(() => {
    const vinculadas = new Set(rotas.list.flatMap((r) => r.orderIds));
    const soltas = orders.list.filter((o) => !vinculadas.has(o.id) && o.stage !== "entregue");
    if (!soltas.length) return;
    let curRotas = rotas.list;
    let curOcs = ocs.list;
    for (const o of soltas) {
      const r = vincularOrderEmRota(o, curRotas, curOcs);
      curRotas = r.rotas;
      curOcs = r.ocs;
    }
    rotas.set(curRotas);
    ocs.set(curOcs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendentes]);
}
