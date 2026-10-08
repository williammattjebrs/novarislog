// Rentabilidade por CT-e: receita = valor do CT-e; custos da OC são rateados por peso das NFs.
import type { AppConfig, Order, OrdemColeta } from "./mock-data";
import { calcOrderCost } from "./cost-calc";
import { costKnown } from "./finance-summary";

export type CteDoc = { id: string; chave: string; numero?: string; valorFiscal?: number; orderIds?: string[]; nfChaves?: string[]; criadoEm?: string };
export type CteNfLinha = { orderId: string; nf: string; peso: number; pct: number; receita: number; custo: number; ocId?: string };
export type CteLinha = {
  chave: string; numero: string; cliente: string; rota: string; data: string; empresaId?: string;
  ocIds: string[]; motoristaId?: string; veiculoId?: string;
  receita: number; custo: number; margem: number; margemPct: number; peso: number;
  custoPendente: boolean; nfs: CteNfLinha[];
};

/** Divide `total` em centavos exatos proporcionalmente aos pesos (fallback: partes iguais). */
export function splitByWeight(total: number, pesos: number[]): number[] {
  if (!pesos.length) return [];
  const w = pesos.every((p) => p > 0) ? pesos : pesos.map(() => 1);
  const sum = w.reduce((a, b) => a + b, 0), cents = Math.round(total * 100);
  const shares = w.map((x) => Math.floor((cents * x) / sum));
  const rank = w.map((x, i) => ({ i, r: (cents * x) / sum - shares[i] })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0, left = cents - shares.reduce((a, b) => a + b, 0); k < left; k++) shares[rank[k % rank.length].i]++;
  return shares.map((s) => s / 100);
}

const chavesDe = (o: Order) => [...new Set([o.cteChave, ...(o.cteChaves ?? [])].filter(Boolean) as string[])];

export function buildCteProfit(orders: Order[], ocs: OrdemColeta[], docs: CteDoc[], cfg: AppConfig): CteLinha[] {
  const byId = new Map(orders.map((o) => [o.id, o]));
  const ocDaNf = new Map<string, OrdemColeta>();
  for (const oc of ocs) if (oc.status !== "cancelada") oc.orderIds.forEach((id) => ocDaNf.set(id, oc));
  // Custo por NF: OC com custo fechado é rateado por peso entre todas as NFs da OC; senão custo da própria NF.
  const custoNf = new Map<string, { v: number; pend: boolean }>();
  for (const oc of ocs) {
    if (oc.status === "cancelada" || !(oc.custoMotorista! > 0)) continue;
    const nfs = oc.orderIds.map((id) => byId.get(id)).filter(Boolean) as Order[];
    splitByWeight(oc.custoMotorista!, nfs.map((n) => n.peso || 0)).forEach((v, i) => custoNf.set(nfs[i].id, { v, pend: false }));
  }
  const custoDe = (o: Order) => custoNf.get(o.id) ?? (costKnown(o) ? { v: calcOrderCost(o.costs, cfg.frota, o.valorFrete).total, pend: false } : { v: 0, pend: true });

  const grupos = new Map<string, Order[]>();
  for (const o of orders) for (const k of chavesDe(o)) grupos.set(k, [...(grupos.get(k) ?? []), o]);
  const docMap = new Map(docs.map((d) => [d.chave, d]));
  const linhas: CteLinha[] = [];
  for (const [chave, nfs0] of grupos) {
    const doc = docMap.get(chave);
    const nfs = nfs0.sort((a, b) => a.numeroNFe.localeCompare(b.numeroNFe));
    const multi = nfs.map((n) => chavesDe(n).length);
    const receita = doc?.valorFiscal ?? nfs.reduce((s, n) => s + (n.cteValor ?? 0), 0);
    const pesoTotal = nfs.reduce((s, n) => s + (n.peso || 0), 0);
    const recNf = splitByWeight(receita, nfs.map((n) => n.peso || 0));
    // NF dividida em mais de um CT-e: o custo dela é repartido igualmente entre esses CT-es.
    const linhasNf = nfs.map((n, i) => { const c = custoDe(n); return { orderId: n.id, nf: n.numeroNFe, peso: n.peso || 0, pct: pesoTotal ? (n.peso || 0) / pesoTotal : 1 / nfs.length, receita: recNf[i], custo: Math.round((c.v / multi[i]) * 100) / 100, ocId: ocDaNf.get(n.id)?.id, pend: c.pend }; });
    const custo = linhasNf.reduce((s, l) => s + l.custo, 0);
    const oc = ocDaNf.get(nfs[0].id);
    const f = nfs[0];
    linhas.push({
      chave, numero: doc?.numero ?? nfs[0].cteNumero ?? chave.slice(-9), cliente: f.clienteNome,
      rota: `${f.cidadeColeta}/${f.ufColeta} → ${f.cidadeEntrega}/${f.ufEntrega}`,
      data: (doc?.criadoEm ?? f.atualizadoEm ?? f.criadoEm ?? "").slice(0, 10), empresaId: oc?.empresaId,
      ocIds: [...new Set(linhasNf.map((l) => l.ocId).filter(Boolean) as string[])], motoristaId: oc?.motoristaId, veiculoId: oc?.veiculoId,
      receita, custo, margem: receita - custo, margemPct: receita ? ((receita - custo) / receita) * 100 : 0, peso: pesoTotal,
      custoPendente: linhasNf.some((l) => l.pend), nfs: linhasNf.map(({ pend: _p, ...l }) => l),
    });
  }
  return linhas.sort((a, b) => b.data.localeCompare(a.data));
}
