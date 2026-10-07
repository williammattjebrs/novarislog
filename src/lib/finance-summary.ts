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