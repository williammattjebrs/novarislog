import { calcOrderCost } from "./cost-calc";
import { monthKey, type Invoice, type Expense, type Order, type FrotaCostParams } from "./mock-data";
import { paidAmount } from "./reliability";
export const receivedAmount = (i: Invoice) => paidAmount(i.movements, i.valorRecebido ?? (i.status === "paga" && !i.movements ? i.valor : 0));
export const expensePaid = (e: Expense) => paidAmount(e.movements, e.valorPago ?? (e.status === "paga" && !e.movements ? e.valor : 0));
export function costKnown(o: Order) {
  return o.costs?.execMode === "terceiro" ? Number.isFinite(o.costs.valorPagoTerceiro) : o.costs?.execMode === "frota" && Number.isFinite(o.costs.kmRodados) && (o.costs.kmRodados ?? 0)>0;
}
export function financeSummary(month: string, invoices: Invoice[], expenses: Expense[], orders: Order[], cfg: FrotaCostParams) {
  const titles=invoices.filter(i=>monthKey(i.competencia ?? i.emissao)===month);
  const monthlyExpenses=expenses.filter(e=>monthKey(e.competencia ?? e.vencimento)===month);
  const monthlyOrders=orders.filter(o=>monthKey(o.criadoEm)===month);
  const direct=monthlyOrders.filter(o=>costKnown(o) && !expenses.some(e=>e.orderId===o.id)).reduce((s,o)=>s+calcOrderCost(o.costs,cfg,o.valorFrete).total,0);
  const expensesTotal=monthlyExpenses.reduce((s,e)=>s+e.valor,0);
  const faturada=titles.reduce((s,i)=>s+i.valor,0);
  return { faturada, despesas:expensesTotal, custo:direct+expensesTotal, resultado:faturada-direct-expensesTotal,
    prevista:monthlyOrders.filter(o=>!o.cteChave && o.origemValor).reduce((s,o)=>s+o.valorFrete,0),
    recebida:titles.reduce((s,i)=>s+receivedAmount(i),0),
    aberta:titles.reduce((s,i)=>s+Math.max(0,i.valor-receivedAmount(i)),0),
    vencida:titles.filter(i=>monthKey(i.vencimento) && new Date(i.vencimento.includes('/') ? i.vencimento.split('/').reverse().join('-') : i.vencimento)<new Date()).reduce((s,i)=>s+Math.max(0,i.valor-receivedAmount(i)),0),
    custosPendentes:monthlyOrders.filter(o=>!costKnown(o) && !expenses.some(e=>e.orderId===o.id)).length,
  };
}
export type ClientCashRow = { cliente: string; faturado: number; recebido: number; aReceber: number };
// Detalhamento por cliente do resumo de caixa: faturado e recebido no mês e saldo a receber até o fim do mês.
export function clientCashDetail(month: string, invoices: Invoice[]) {
  const cashOf = (i: Invoice, pred: (m: string) => boolean) => {
    const legacy = i.recebidoEm && pred(monthKey(i.recebidoEm)) ? (i.valorRecebido ?? (i.status === "paga" && !i.movements ? i.valor : 0)) : 0;
    return legacy + (i.movements ?? []).filter((m) => pred(monthKey(m.date))).reduce((v, m) => v + (m.type === "estorno" ? -m.value : m.value), 0);
  };
  const map = new Map<string, ClientCashRow>();
  const row = (nome?: string) => {
    const k = (nome ?? "").trim() || "Sem cliente";
    let r = map.get(k);
    if (!r) { r = { cliente: k, faturado: 0, recebido: 0, aReceber: 0 }; map.set(k, r); }
    return r;
  };
  for (const i of invoices) {
    const r = row(i.clienteNome);
    const em = monthKey(i.competencia ?? i.emissao);
    if (em === month) r.faturado += i.valor;
    r.recebido += cashOf(i, (m) => m === month);
    if (em && em <= month) r.aReceber += Math.max(0, i.valor - cashOf(i, (m) => m <= month));
  }
  const rows = [...map.values()]
    .filter((r) => r.faturado || r.recebido || r.aReceber)
    .sort((a, b) => b.aReceber - a.aReceber || b.recebido - a.recebido || a.cliente.localeCompare(b.cliente));
  const totais = rows.reduce((t, r) => ({ faturado: t.faturado + r.faturado, recebido: t.recebido + r.recebido, aReceber: t.aReceber + r.aReceber }), { faturado: 0, recebido: 0, aReceber: 0 });
  return { rows, totais };
}